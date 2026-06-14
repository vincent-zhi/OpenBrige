import { Hono } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { execSync } from 'node:child_process';
import type { Store } from '@openbrige/local-store';
import type { PtySupervisor } from '@openbrige/pty-supervisor';
import type { GitDiffEngine } from '@openbrige/git-diff-engine';
import type { SmartCardFactory } from '@openbrige/smart-cards';
import type { WorkspaceWatcher } from '@openbrige/workspace-watcher';
import type { ConnectionManager } from '@openbrige/connection-manager';
import type { NetworkDoctor } from '@openbrige/network-doctor';
import type { NotificationRouter } from '@openbrige/notification-router';
import type { PluginRegistry } from '@openbrige/plugin-runtime';
import type { WorktreeManager } from '@openbrige/worktree-manager';
import type { SessionRecorder } from '@openbrige/session-recorder';
import type { SessionStatus, BridgeEvent, AgentManifest } from '@openbrige/shared-types';

export interface RouteDeps {
  store: Store;
  supervisor: PtySupervisor;
  diffEngine: GitDiffEngine;
  cardFactory: SmartCardFactory;
  watcher: WorkspaceWatcher | null;
  connectionManager: ConnectionManager;
  networkDoctor: NetworkDoctor;
  notificationRouter: NotificationRouter;
  pluginRegistry: PluginRegistry;
  worktreeManager: WorktreeManager;
  startTime: number;
  host: string;
  port: number;
  /** Shared set of valid paired device tokens */
  pairedDeviceTokens: Set<string>;
  /** Session recorders for replay */
  recorders: Map<string, SessionRecorder>;
  /** Broadcast event to WebSocket subscribers and persist */
  broadcastEvent: (sessionId: string, event: BridgeEvent) => void;
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
    cardFactory: _cardFactory,
    connectionManager: _connectionManager,
    networkDoctor,
    notificationRouter,
    pluginRegistry,
    worktreeManager,
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
      let effectiveCwd = parsed.data.cwd;
      let worktreeInfo: import('@openbrige/worktree-manager').WorktreeInfo | undefined;

      // When workspaceMode is 'worktree', create a git worktree before spawning
      if (parsed.data.workspaceMode === 'worktree') {
        const isRepo = await worktreeManager.isGitRepo(parsed.data.cwd);
        if (!isRepo) {
          return c.json({ error: 'Cannot use worktree mode: cwd is not a git repository' }, 400);
        }
        // Generate a pre-session ID to create the worktree with a deterministic path
        const preSessionId = `wt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        worktreeInfo = await worktreeManager.createWorktree(parsed.data.cwd, preSessionId);
        effectiveCwd = worktreeInfo.path;
      }

      const sessionId = await supervisor.spawn({
        command: parsed.data.command,
        args: parsed.data.args,
        cwd: effectiveCwd,
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
    const sessionId = c.req.param('id');

    const recorder = deps.recorders.get(sessionId);
    if (recorder) {
      const recording = recorder.getRecording();
      return c.json(recording.entries.map((e) => e.event));
    }

    // No in-memory recorder; fall back to persisted events from the store
    const events = store.getEvents(sessionId);
    return c.json(events);
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

  // ── Sandbox endpoints ───────────────────────────────────────

  // GET /api/sessions/:id/sandbox/patch
  app.get('/api/sessions/:id/sandbox/patch', async (c) => {
    const id = c.req.param('id');
    const session = store.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const hasWorktree = await worktreeManager.hasWorktree(session.cwd, id);
    if (!hasWorktree) {
      return c.json({ error: 'No sandbox worktree exists for this session' }, 404);
    }

    try {
      const patch = await worktreeManager.generatePatch(session.cwd, id);
      return c.text(patch);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate patch';
      return c.json({ error: message }, 500);
    }
  });

  // POST /api/sessions/:id/sandbox/merge
  app.post('/api/sessions/:id/sandbox/merge', async (c) => {
    const confirmHeader = c.req.header('X-Confirm');
    if (confirmHeader !== 'true') {
      return c.json({ error: 'X-Confirm header is required for this action' }, 400);
    }

    const id = c.req.param('id');
    const session = store.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const hasWorktree = await worktreeManager.hasWorktree(session.cwd, id);
    if (!hasWorktree) {
      return c.json({ error: 'No sandbox worktree exists for this session' }, 404);
    }

    try {
      await worktreeManager.mergeWorktree(session.cwd, id);
      return c.json({ ok: true, message: 'Sandbox merged into main workspace' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to merge sandbox';
      return c.json({ error: message }, 500);
    }
  });

  // DELETE /api/sessions/:id/sandbox
  app.delete('/api/sessions/:id/sandbox', async (c) => {
    const confirmHeader = c.req.header('X-Confirm');
    if (confirmHeader !== 'true') {
      return c.json({ error: 'X-Confirm header is required for this action' }, 400);
    }

    const id = c.req.param('id');
    const session = store.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const hasWorktree = await worktreeManager.hasWorktree(session.cwd, id);
    if (!hasWorktree) {
      return c.json({ error: 'No sandbox worktree exists for this session' }, 404);
    }

    try {
      await worktreeManager.removeWorktree(session.cwd, id);
      return c.json({ ok: true, message: 'Sandbox deleted' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete sandbox';
      return c.json({ error: message }, 500);
    }
  });

  // ── Notification config endpoints ───────────────────────────

  // GET /api/notifications/config
  app.get('/api/notifications/config', (c) => {
    const providers = notificationRouter.getProviders();
    return c.json({ providers });
  });

  // PUT /api/notifications/config
  app.put('/api/notifications/config', async (c) => {
    const body = await c.req.json();
    const { enabled } = body as { enabled?: Record<string, boolean> };

    if (enabled) {
      for (const [id, isEnabled] of Object.entries(enabled)) {
        if (isEnabled) {
          notificationRouter.enableProvider(id);
        } else {
          notificationRouter.disableProvider(id);
        }
      }
    }

    const providers = notificationRouter.getProviders();
    return c.json({ providers });
  });

  // ── Session Pause/Resume endpoints (Task 22) ─────────────

  // POST /api/sessions/:id/pause
  app.post('/api/sessions/:id/pause', async (c) => {
    const id = c.req.param('id');
    const session = store.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.status === 'paused') {
      return c.json({ error: 'Session is already paused' }, 400);
    }

    const previousStatus = session.status;

    try {
      supervisor.pause(id);
      const statusEvent = store.appendEvent(
        id,
        'session.status.changed',
        { oldStatus: previousStatus, newStatus: 'paused', reason: 'paused by user' },
      );
      deps.broadcastEvent(id, statusEvent);
      store.updateSession(id, { status: 'paused' as SessionStatus });
      return c.json({ ok: true, previousStatus });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pause session';
      return c.json({ error: message }, 500);
    }
  });

  // POST /api/sessions/:id/resume
  app.post('/api/sessions/:id/resume', async (c) => {
    const id = c.req.param('id');
    const session = store.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.status !== 'paused') {
      return c.json({ error: 'Session is not paused' }, 400);
    }

    // Determine the previous status to restore to
    const body = await c.req.json().catch(() => ({}));
    const previousStatus = (body.previousStatus as SessionStatus) || 'running';

    try {
      supervisor.resume(id);
      const statusEvent = store.appendEvent(
        id,
        'session.status.changed',
        { oldStatus: 'paused', newStatus: previousStatus, reason: 'resumed by user' },
      );
      deps.broadcastEvent(id, statusEvent);
      store.updateSession(id, { status: previousStatus });
      return c.json({ ok: true, status: previousStatus });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume session';
      return c.json({ error: message }, 500);
    }
  });

  // ── Commit/PR Generation endpoints (Task 23) ─────────────

  // POST /api/sessions/:id/generate-commit
  app.post('/api/sessions/:id/generate-commit', async (c) => {
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

      if (diff.filesChanged === 0) {
        return c.json({ message: 'chore: no changes detected' });
      }

      // Build summary of changes
      const statusCounts: Record<string, number> = {};
      for (const file of diff.files) {
        statusCounts[file.status] = (statusCounts[file.status] || 0) + 1;
      }

      // Determine conventional commit type
      let commitType = 'feat';
      if (statusCounts['deleted'] && !statusCounts['added'] && !statusCounts['modified']) {
        commitType = 'chore';
      } else if (Object.keys(statusCounts).length === 1 && statusCounts['modified']) {
        commitType = 'fix';
      }

      // Build short summary
      const summaryParts: string[] = [];
      if (statusCounts['added']) summaryParts.push(`${statusCounts['added']} added`);
      if (statusCounts['modified']) summaryParts.push(`${statusCounts['modified']} modified`);
      if (statusCounts['deleted']) summaryParts.push(`${statusCounts['deleted']} deleted`);
      if (statusCounts['renamed']) summaryParts.push(`${statusCounts['renamed']} renamed`);
      if (statusCounts['untracked']) summaryParts.push(`${statusCounts['untracked']} untracked`);
      const summary = summaryParts.join(', ');

      // Build file list with +/- stats
      const fileList = diff.files
        .map((f) => `- ${f.path} (+${f.insertions}/-${f.deletions})`)
        .join('\n');

      const message = `${commitType}: ${summary}\n\nChanges:\n${fileList}`;
      return c.json({ message });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate commit message';
      return c.json({ error: message }, 500);
    }
  });

  // POST /api/sessions/:id/generate-pr
  app.post('/api/sessions/:id/generate-pr', async (c) => {
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

      if (diff.filesChanged === 0) {
        return c.json({ description: '## Summary\nNo changes detected.\n' });
      }

      // Build summary based on file changes
      const statusCounts: Record<string, number> = {};
      for (const file of diff.files) {
        statusCounts[file.status] = (statusCounts[file.status] || 0) + 1;
      }
      const summaryParts: string[] = [];
      if (statusCounts['added']) summaryParts.push(`${statusCounts['added']} file(s) added`);
      if (statusCounts['modified']) summaryParts.push(`${statusCounts['modified']} file(s) modified`);
      if (statusCounts['deleted']) summaryParts.push(`${statusCounts['deleted']} file(s) deleted`);
      if (statusCounts['renamed']) summaryParts.push(`${statusCounts['renamed']} file(s) renamed`);
      if (statusCounts['untracked']) summaryParts.push(`${statusCounts['untracked']} file(s) untracked`);
      const summary = `This PR includes changes across ${diff.filesChanged} file(s): ${summaryParts.join(', ')}.`;

      // Group files by category (status)
      const groupedLines: string[] = [];
      const groups: Record<string, string[]> = {};
      for (const file of diff.files) {
        const key = file.status;
        if (!groups[key]) groups[key] = [];
        groups[key].push(file.path);
      }
      for (const [status, paths] of Object.entries(groups)) {
        groupedLines.push(`**${status.charAt(0).toUpperCase() + status.slice(1)}:**`);
        for (const p of paths) {
          groupedLines.push(`- ${p}`);
        }
      }

      const description = [
        '## Summary',
        summary,
        '',
        '## Changed Files',
        ...groupedLines,
        '',
        '## Stats',
        `+${diff.insertions} insertions / -${diff.deletions} deletions across ${diff.filesChanged} file(s)`,
      ].join('\n');

      return c.json({ description });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PR description';
      return c.json({ error: message }, 500);
    }
  });

  // ── Plugin Event Receiving endpoint (Task 24) ─────────────

  // POST /api/plugin-events
  app.post('/api/plugin-events', async (c) => {
    const token = extractToken(c);
    if (!isPaired(deps, token)) {
      return c.json({ error: 'Unauthorized. Pair your device first.' }, 401);
    }

    const body = await c.req.json();
    const { type, sessionId, data } = body as { type?: string; sessionId?: string; data?: Record<string, unknown> };

    if (!type || typeof type !== 'string') {
      return c.json({ error: 'Event "type" field is required and must be a string' }, 400);
    }

    // If sessionId is provided, validate the session exists
    if (sessionId) {
      const session = store.getSession(sessionId);
      if (!session) {
        return c.json({ error: 'Session not found' }, 404);
      }
    }

    const effectiveSessionId = sessionId ?? '__global__';

    // Inject the event into the Event Bus
    const event = store.appendEvent(
      effectiveSessionId,
      'plugin.event',
      {
        pluginId: 'external',
        eventType: type,
        data: data ?? {},
      },
    );
    deps.broadcastEvent(effectiveSessionId, event);

    return c.json({ ok: true, event: { id: event.id, seq: event.seq } }, 201);
  });

  // ── Setup Command endpoint ───────────────────────────────────

  // GET /api/setup-command?agent=<agentId>
  app.get('/api/setup-command', (c) => {
    const agentId = c.req.query('agent');
    if (!agentId) {
      return c.json({ error: 'Missing "agent" query parameter' }, 400);
    }

    const proto = c.req.header('x-forwarded-proto') ?? (deps.port === 443 ? 'https' : 'http');
    const hostHeader = c.req.header('host') ?? `${deps.host}:${deps.port}`;
    const serverUrl = `${proto}://${hostHeader}`;

    const command = `npx @openbrige/cli@latest setup ${agentId} --server ${serverUrl}`;

    const agentNames: Record<string, string> = {
      'claude-code': 'Claude Code',
      'codex': 'Codex',
      'aider': 'Aider',
      'gemini-cli': 'Gemini CLI',
      'opencode': 'OpenCode',
      'cursor': 'Cursor',
      'copilot': 'GitHub Copilot',
      'windsurf': 'Windsurf',
      'cline': 'Cline',
      'trae': 'TRAE SOLO',
      'goose': 'Goose',
      'roo-code': 'Roo Code',
      'hermes': 'Hermes Agent',
      'devin': 'Devin',
      'replit': 'Replit Agent',
      'antigravity': 'Antigravity',
      'continue': 'Continue',
    };

    const instruction = [
      `请运行以下命令来安装和配置 OpenBrige 集成：`,
      ``,
      `\`${command}\``,
      ``,
      `这个命令会自动完成以下操作：`,
      `1. 在当前项目目录初始化 .openbrige 配置`,
      `2. 安装 ${agentNames[agentId] ?? agentId} 的 Agent Profile`,
      `3. 配置与 OpenBrige 服务器的连接`,
      ``,
      `安装完成后，你可以通过 ${serverUrl} 在浏览器中监控 Agent 会话。`,
    ].join('\n');

    // Generate MCP config preview for MCP-type agents
    const mcpAgents = ['claude-code', 'cursor', 'windsurf', 'cline', 'goose', 'roo-code', 'continue'];
    let mcpConfig: string | undefined;
    if (mcpAgents.includes(agentId)) {
      const mcpEntry = {
        openbrige: {
          command: 'npx',
          args: ['-y', '@openbrige/cli', 'mcp', '--server', serverUrl],
        },
      };
      mcpConfig = JSON.stringify({ mcpServers: mcpEntry }, null, 2);
    }

    return c.json({
      agent: agentId,
      serverUrl,
      command,
      instruction,
      mcpConfig,
    });
  });

  // GET /api/agents
  app.get('/api/agents', (c) => {
    const agents: AgentManifest[] = [
      // Already adapted
      { id: 'claude-code', name: 'Claude Code', command: 'claude', type: 'cli-agent', description: 'Anthropic Claude Code CLI', icon: 'bot', color: 'purple', detection: { commands: ['claude'], configFiles: ['.claude/settings.json', 'CLAUDE.md'] }, integration: { method: 'mcp' }, profile: 'profile.yaml' },
      { id: 'codex', name: 'Codex', command: 'codex', type: 'cli-agent', description: 'OpenAI Codex CLI', icon: 'terminal', color: 'green', detection: { commands: ['codex'], configFiles: ['.codex'] }, integration: { method: 'config-inject' }, profile: 'profile.yaml' },
      { id: 'aider', name: 'Aider', command: 'aider', type: 'cli-agent', description: 'Aider AI pair programming', icon: 'code', color: 'blue', detection: { commands: ['aider'], configFiles: ['.aider.conf.yml'] }, integration: { method: 'config-inject' }, profile: 'profile.yaml' },
      { id: 'gemini-cli', name: 'Gemini CLI', command: 'gemini', type: 'cli-agent', description: 'Google Gemini CLI', icon: 'sparkles', color: 'orange', detection: { commands: ['gemini'], configFiles: ['.gemini'] }, integration: { method: 'config-inject' }, profile: 'profile.yaml' },
      { id: 'opencode', name: 'OpenCode', command: 'opencode', type: 'cli-agent', description: 'OpenCode CLI', icon: 'monitor', color: 'cyan', detection: { commands: ['opencode'], configFiles: ['opencode.json'] }, integration: { method: 'config-inject' }, profile: 'profile.yaml' },
      // Tier 1
      { id: 'cursor', name: 'Cursor', command: 'cursor', type: 'ide-agent', description: 'AI-first code editor with agent mode', icon: 'cursor', color: 'indigo', detection: { commands: ['cursor', 'cursor-agent'], configFiles: ['.cursor/mcp.json', '.cursor/rules'] }, integration: { method: 'mcp' }, profile: 'profile.yaml' },
      { id: 'copilot', name: 'GitHub Copilot', command: 'gh', type: 'ide-agent', description: 'GitHub Copilot Agent Mode', icon: 'github', color: 'gray', detection: { commands: ['gh', 'github-copilot-cli'], configFiles: ['.github/copilot'] }, integration: { method: 'config-inject' }, profile: 'profile.yaml' },
      { id: 'windsurf', name: 'Windsurf', command: 'windsurf', type: 'ide-agent', description: 'Codeium Windsurf AI IDE', icon: 'wind', color: 'teal', detection: { commands: ['windsurf', 'codeium'], configFiles: ['.windsurf/mcp.json', '.windsurf/rules'] }, integration: { method: 'mcp' }, profile: 'profile.yaml' },
      // Tier 2
      { id: 'cline', name: 'Cline', command: 'cline', type: 'ide-agent', description: 'Autonomous coding agent for VS Code', icon: 'robot', color: 'amber', detection: { commands: ['cline'], configFiles: ['.cline/mcp.json', '.clinerules'] }, integration: { method: 'mcp' }, profile: 'profile.yaml' },
      { id: 'trae', name: 'TRAE SOLO', command: 'trae', type: 'ide-agent', description: 'ByteDance AI-native IDE', icon: 'zap', color: 'red', detection: { commands: ['trae'], configFiles: ['.trae/rules'] }, integration: { method: 'config-inject' }, profile: 'profile.yaml' },
      { id: 'goose', name: 'Goose', command: 'goose', type: 'cli-agent', description: 'Block open-source AI agent', icon: 'bird', color: 'yellow', detection: { commands: ['goose'], configFiles: ['.goose/config.yaml'] }, integration: { method: 'mcp' }, profile: 'profile.yaml' },
      // Tier 3
      { id: 'roo-code', name: 'Roo Code', command: 'roo-code', type: 'ide-agent', description: 'Open-source VS Code AI extension', icon: 'puzzle', color: 'pink', detection: { commands: ['roo-code', 'roo'], configFiles: ['.roo/mcp.json', '.roorules'] }, integration: { method: 'mcp' }, profile: 'profile.yaml' },
      { id: 'hermes', name: 'Hermes Agent', command: 'hermes', type: 'cli-agent', description: 'Nous Research autonomous AI agent', icon: 'shield', color: 'slate', detection: { commands: ['hermes'], configFiles: ['.hermes/config.json'] }, integration: { method: 'config-inject' }, profile: 'profile.yaml' },
      { id: 'devin', name: 'Devin', command: 'devin', type: 'cloud-agent', description: 'Cognition AI software engineer', icon: 'cloud', color: 'violet', detection: { commands: ['devin'], configFiles: [] }, integration: { method: 'instruction' }, profile: 'profile.yaml' },
      // Tier 4
      { id: 'replit', name: 'Replit Agent', command: 'repl', type: 'cloud-agent', description: 'Replit cloud AI development', icon: 'globe', color: 'emerald', detection: { commands: ['repl', 'replit'], configFiles: [] }, integration: { method: 'instruction' }, profile: 'profile.yaml' },
      { id: 'antigravity', name: 'Antigravity', command: 'antigravity', type: 'cli-agent', description: 'Google Antigravity coding agent', icon: 'rocket', color: 'lime', detection: { commands: ['antigravity'], configFiles: [] }, integration: { method: 'config-inject' }, profile: 'profile.yaml' },
      { id: 'continue', name: 'Continue', command: 'continue', type: 'ide-agent', description: 'Open-source AI code assistant', icon: 'play', color: 'sky', detection: { commands: ['continue'], configFiles: ['.continue/config.json'] }, integration: { method: 'mcp' }, profile: 'profile.yaml' },
    ];

    const shouldDetect = c.req.query('detect') === 'true';

    if (!shouldDetect) {
      return c.json({ agents });
    }

    const isWin = process.platform === 'win32';
    const detectCmd = isWin ? 'where' : 'which';

    const agentsWithInstall = agents.map((agent) => {
      const installed = agent.detection.commands.some((cmd) => commandExistsOnServer(detectCmd, cmd));
      return { ...agent, installed };
    });

    return c.json({ agents: agentsWithInstall });
  });

  return app;
}

/**
 * Check if a command exists in the system PATH (server-side).
 */
function commandExistsOnServer(detectCmd: string, command: string): boolean {
  try {
    execSync(`${detectCmd} ${command}`, { stdio: 'pipe', timeout: 5000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}
