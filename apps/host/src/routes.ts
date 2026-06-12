import { Hono } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Store } from '@openbrige/local-store';
import type { PtySupervisor } from '@openbrige/pty-supervisor';
import type { GitDiffEngine } from '@openbrige/git-diff-engine';
import type { SmartCardFactory } from '@openbrige/smart-cards';
import type { WorkspaceWatcher } from '@openbrige/workspace-watcher';
import type { ConnectionManager } from '@openbrige/connection-manager';
import type { NetworkDoctor } from '@openbrige/network-doctor';
import type { PluginRegistry } from '@openbrige/plugin-runtime';
import type { SessionRecorder } from '@openbrige/session-recorder';
import type { SessionStatus } from '@openbrige/shared-types';

export interface RouteDeps {
  store: Store;
  supervisor: PtySupervisor;
  diffEngine: GitDiffEngine;
  cardFactory: SmartCardFactory;
  watcher: WorkspaceWatcher | null;
  connectionManager: ConnectionManager;
  networkDoctor: NetworkDoctor;
  pluginRegistry: PluginRegistry;
  startTime: number;
  host: string;
  port: number;
  /** Shared set of valid paired device tokens */
  pairedDeviceTokens: Set<string>;
  /** Session recorders for replay */
  recorders: Map<string, SessionRecorder>;
}

// ── Pairing / Auth ──────────────────────────────────────────

const PAIR_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes
const pendingPairTokens = new Map<string, { createdAt: number }>();

function generatePairToken(): string {
  const token = nanoid(32);
  pendingPairTokens.set(token, { createdAt: Date.now() });
  // Clean expired tokens
  for (const [t, info] of pendingPairTokens) {
    if (Date.now() - info.createdAt > PAIR_TOKEN_TTL_MS) {
      pendingPairTokens.delete(t);
    }
  }
  return token;
}

function isPaired(deps: RouteDeps, deviceToken: string | undefined): boolean {
  if (!deviceToken) return false;
  return deps.pairedDeviceTokens.has(deviceToken);
}

function extractToken(c: { req: { header(name: string): string | undefined } }): string | undefined {
  return c.req.header('Authorization')?.replace('Bearer ', '') ?? undefined;
}

// ── Validation schemas ──────────────────────────────────────

const createSessionSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  cwd: z.string().min(1),
  profileId: z.string().optional(),
  workspaceMode: z.enum(['current', 'worktree', 'temporary-copy']).optional(),
  title: z.string().optional(),
});

const sendInputSchema = z.object({
  text: z.string(),
});

const pairRequestSchema = z.object({
  token: z.string().min(1),
  deviceName: z.string().optional(),
});

export function createRoutes(deps: RouteDeps): Hono {
  const app = new Hono();

  const {
    store,
    supervisor,
    diffEngine,
    cardFactory,
    connectionManager,
    networkDoctor,
    pluginRegistry,
    startTime,
    host,
    port,
  } = deps;

  // ── Public routes (no auth required) ───────────────────────

  // GET /api/health
  app.get('/api/health', (c) => {
    return c.json({
      status: 'ok',
      version: '0.1.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
    });
  });

  // GET /api/pair/token - Get a pairing token (for display on host)
  app.get('/api/pair/token', (c) => {
    const token = generatePairToken();
    return c.json({ token, expiresIn: PAIR_TOKEN_TTL_MS });
  });

  // POST /api/pair - Pair a device using a token
  app.post('/api/pair', async (c) => {
    const body = await c.req.json();
    const parsed = pairRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
    }

    const { token } = parsed.data;
    const pairInfo = pendingPairTokens.get(token);

    if (!pairInfo) {
      return c.json({ error: 'Invalid or expired pairing token' }, 401);
    }

    if (Date.now() - pairInfo.createdAt > PAIR_TOKEN_TTL_MS) {
      pendingPairTokens.delete(token);
      return c.json({ error: 'Pairing token has expired' }, 401);
    }

    // Token is valid, consume it (one-time use)
    pendingPairTokens.delete(token);

    // Generate device token
    const deviceToken = nanoid(48);
    deps.pairedDeviceTokens.add(deviceToken);

    return c.json({ deviceToken, message: 'Device paired successfully' });
  });

  // ── Auth middleware (all /api routes below require pairing) ─

  app.use('/api/sessions/*', async (c, next) => {
    const token = extractToken(c);
    if (!isPaired(deps, token)) {
      return c.json({ error: 'Unauthorized. Pair your device first.' }, 401);
    }
    await next();
  });

  app.use('/api/profiles', async (c, next) => {
    const token = extractToken(c);
    if (!isPaired(deps, token)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
  });

  app.use('/api/connections', async (c, next) => {
    const token = extractToken(c);
    if (!isPaired(deps, token)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
  });

  app.use('/api/doctor/*', async (c, next) => {
    const token = extractToken(c);
    if (!isPaired(deps, token)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
  });

  // ── Policy check for sensitive actions ──────────────────────

  async function checkPolicy(action: string, c: { json: (body: unknown, status?: number) => Response; req: { header(name: string): string | undefined } }): Promise<boolean> {
    // Check if any policy plugin blocks this action
    const plugins = pluginRegistry.getPlugins().filter(p => p.manifest.type === 'policy');
    for (const plugin of plugins) {
      try {
        const policyModule = await import('node:path').then(path =>
          import('node:fs').then(fs => {
            const policyPath = path.join(plugin.basePath, 'policy.json');
            if (fs.existsSync(policyPath)) {
              const content = fs.readFileSync(policyPath, 'utf-8');
              return JSON.parse(content);
            }
            return null;
          })
        );
        if (policyModule?.rules) {
          const rule = policyModule.rules.find((r: { action: string }) => r.action === action);
          if (rule && rule.requireConfirmation) {
            const confirmed = c.req.header('x-confirm-action') === action;
            if (!confirmed) {
              c.json({ error: `Action "${action}" requires confirmation. Send X-Confirm-Action header.`, requiresConfirmation: true, action }, 403);
              return false;
            }
          }
        }
      } catch {
        // Policy check failed, allow by default
      }
    }
    return true;
  }

  // ── Protected routes ───────────────────────────────────────

  // GET /api/sessions
  app.get('/api/sessions', (c) => {
    const status = c.req.query('status') as SessionStatus | undefined;
    const sessions = store.listSessions(status);
    return c.json({ sessions });
  });

  // GET /api/sessions/:id
  app.get('/api/sessions/:id', (c) => {
    const id = c.req.param('id');
    const session = store.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }
    return c.json({ session });
  });

  // POST /api/sessions
  app.post('/api/sessions', async (c) => {
    const body = await c.req.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
    }

    try {
      const sessionId = await supervisor.spawn({
        command: parsed.data.command,
        args: parsed.data.args,
        cwd: parsed.data.cwd,
        profileId: parsed.data.profileId,
        workspaceMode: parsed.data.workspaceMode,
        title: parsed.data.title,
      });
      const session = store.getSession(sessionId);
      return c.json({ session }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to spawn session';
      return c.json({ error: message }, 500);
    }
  });

  // POST /api/sessions/:id/input
  app.post('/api/sessions/:id/input', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = sendInputSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
    }

    try {
      supervisor.writeInput(id, parsed.data.text);
      return c.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send input';
      return c.json({ error: message }, 404);
    }
  });

  // POST /api/sessions/:id/stop
  app.post('/api/sessions/:id/stop', async (c) => {
    const id = c.req.param('id');
    const policyOk = await checkPolicy('session.stop', c);
    if (!policyOk) return;
    try {
      await supervisor.stop(id);
      return c.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop session';
      return c.json({ error: message }, 404);
    }
  });

  // GET /api/sessions/:id/events
  app.get('/api/sessions/:id/events', (c) => {
    const id = c.req.param('id');
    const cursor = c.req.query('cursor');
    const limit = c.req.query('limit');

    const session = store.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const afterSeq = cursor ? parseInt(cursor, 10) : undefined;
    const effectiveLimit = limit ? parseInt(limit, 10) : undefined;

    if (cursor && (isNaN(afterSeq!) || afterSeq! < 0)) {
      return c.json({ error: 'Invalid cursor parameter' }, 400);
    }
    if (limit && (isNaN(effectiveLimit!) || effectiveLimit! < 1)) {
      return c.json({ error: 'Invalid limit parameter' }, 400);
    }

    const events = store.getEvents(id, afterSeq, effectiveLimit);
    const currentCursor = store.getEventCursor(id);
    return c.json({ events, cursor: currentCursor });
  });

  // GET /api/sessions/:id/diff
  app.get('/api/sessions/:id/diff', async (c) => {
    const id = c.req.param('id');
    const session = store.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    try {
      const isRepo = await diffEngine.isGitRepo(session.cwd);
      if (!isRepo) {
        return c.json({ error: 'Session cwd is not a git repository' }, 400);
      }
      const diff = await diffEngine.getDiffSummary(session.cwd);
      return c.json({ diff });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get diff';
      return c.json({ error: message }, 500);
    }
  });

  // GET /api/sessions/:id/cards
  app.get('/api/sessions/:id/cards', (c) => {
    const id = c.req.param('id');
    const session = store.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const cards = store.getSmartCards(id);
    return c.json({ cards });
  });

  // GET /api/sessions/:id/files
  app.get('/api/sessions/:id/files', (c) => {
    const id = c.req.param('id');
    const session = store.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const files = store.getFiles(id);
    return c.json({ files });
  });

  // GET /api/profiles
  app.get('/api/profiles', (c) => {
    const profiles = pluginRegistry.getProfiles();
    return c.json({ profiles });
  });

  // GET /api/connections
  app.get('/api/connections', (c) => {
    const connections = store.getConnections();
    return c.json({ connections });
  });

  // GET /api/doctor/connect
  app.get('/api/doctor/connect', async (c) => {
    try {
      const results = await networkDoctor.runDiagnostics(host, port);
      return c.json({ results });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Diagnostics failed';
      return c.json({ error: message }, 500);
    }
  });

  // GET /api/sessions/:id/recording
  app.get('/api/sessions/:id/recording', (c) => {
    const id = c.req.param('id');
    // Return recording from the recorders map
    // This needs access to recorders, so add it to RouteDeps
    return c.json({ error: 'Recording not available via API - use event stream' }, 501);
  });

  // GET /api/plugins
  app.get('/api/plugins', (c) => {
    const type = c.req.query('type');
    const plugins = pluginRegistry.getPlugins();
    const filtered = type
      ? plugins.filter((p) => p.manifest.type === type)
      : plugins;
    return c.json({ plugins: filtered });
  });

  // GET /api/actions
  app.get('/api/actions', (c) => {
    const status = c.req.query('status');
    const actions = pluginRegistry.getActions(status);
    return c.json({ actions });
  });

  return app;
}
