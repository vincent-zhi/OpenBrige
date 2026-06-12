import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '@openbrige/local-store';
import { PtySupervisor } from '@openbrige/pty-supervisor';
import { WorkspaceWatcher } from '@openbrige/workspace-watcher';
import { GitDiffEngine } from '@openbrige/git-diff-engine';
import { OutputClassifier } from '@openbrige/output-classifier';
import { SmartCardFactory } from '@openbrige/smart-cards';
import { WorktreeManager } from '@openbrige/worktree-manager';
import { SessionRecorder } from '@openbrige/session-recorder';
import { ConnectionManager, LanDirectProvider } from '@openbrige/connection-manager';
import { NetworkDoctor } from '@openbrige/network-doctor';
import { PluginLoader, PluginRegistry } from '@openbrige/plugin-runtime';
import { serve } from '@hono/node-server';
import { createRoutes, type RouteDeps } from './routes.js';
import { createWsHandler } from './ws.js';
import type { Server } from 'node:http';
import type { BridgeEvent, BridgeSession, WorkspaceFileChangedPayload, GitDiffUpdatedPayload, ClassifierCardCreatedPayload } from '@openbrige/shared-types';
import type { Classification } from '@openbrige/smart-cards';

export interface HostConfig {
  port: number;
  host: string;
  dbPath?: string;
  pluginDirs?: string[];
  profileDirs?: string[];
  workspaceDir?: string;
  /** Explicitly enable public (non-localhost) access */
  publicMode?: boolean;
  /** IP allowlist - if set, only these IPs can connect */
  ipAllowlist?: string[];
  /** Rate limit: max requests per minute per IP */
  rateLimitPerMinute?: number;
  /** Allowed origins for CORS/Origin check */
  allowedOrigins?: string[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createHost(config: HostConfig): {
  app: Hono;
  init: (server: Server) => ReturnType<typeof createWsHandler>;
  shutdown: () => Promise<void>;
} {
  const app = new Hono();

  // Rate limiting
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_WINDOW = 60_000; // 1 minute
  const rateLimitMax = config.rateLimitPerMinute ?? 120;

  app.use('*', async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      ?? c.req.header('x-real-ip')
      ?? 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    } else {
      entry.count++;
      if (entry.count > rateLimitMax) {
        return c.json({ error: 'Rate limit exceeded' }, 429);
      }
    }
    await next();
  });

  // IP allowlist
  if (config.ipAllowlist && config.ipAllowlist.length > 0) {
    app.use('*', async (c, next) => {
      const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
        ?? c.req.header('x-real-ip')
        ?? 'unknown';
      if (!config.ipAllowlist!.includes(ip)) {
        return c.json({ error: 'Access denied' }, 403);
      }
      await next();
    });
  }

  // Public mode check - reject non-localhost if not enabled
  if (!config.publicMode) {
    app.use('*', async (c, next) => {
      const host = c.req.header('host') ?? '';
      if (!host.startsWith('localhost') && !host.startsWith('127.0.0.1') && !host.startsWith('0.0.0.0')) {
        // Allow if from LAN (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
        const isLan = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
        if (!isLan) {
          return c.json({ error: 'Public access not enabled. Start with --public flag.' }, 403);
        }
      }
      await next();
    });
  }

  // Origin validation
  const allowedOrigins = config.allowedOrigins ?? [];
  app.use('*', async (c, next) => {
    const origin = c.req.header('origin');
    if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin) && !allowedOrigins.includes('*')) {
      return c.json({ error: 'Origin not allowed' }, 403);
    }
    await next();
  });

  // Periodic cleanup of rate limit map
  const rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(ip);
    }
  }, 5 * 60_000);

  const dbPath = config.dbPath ?? path.join(process.cwd(), '.openbrige', 'data.db');
  const store = new Store(dbPath);

  // WebSocket handler - created later in init()
  let wsHandler: ReturnType<typeof createWsHandler> | null = null;

  // Session recorders for replay
  const recorders = new Map<string, SessionRecorder>();

  // Event bus: broadcast to WebSocket subscribers
  function broadcastEvent(sessionId: string, event: BridgeEvent): void {
    wsHandler?.broadcast(sessionId, event);
    // Record for replay
    let recorder = recorders.get(sessionId);
    if (!recorder) {
      recorder = new SessionRecorder(sessionId);
      recorders.set(sessionId, recorder);
    }
    recorder.record(event);
  }

  // PTY Supervisor - connected to event bus
  const supervisor = new PtySupervisor(store, broadcastEvent);

  // Output Classifier - processes PTY output into structured states
  const classifier = new OutputClassifier();

  // Smart Card Factory - creates cards from classifications
  const cardFactory = new SmartCardFactory();

  // Git Diff Engine
  const diffEngine = new GitDiffEngine();

  // Worktree Manager
  const worktreeManager = new WorktreeManager();

  // Connection Manager
  const connectionManager = new ConnectionManager();
  const lanProvider = new LanDirectProvider();
  connectionManager.registerProvider(lanProvider);

  // Network Doctor
  const networkDoctor = new NetworkDoctor();

  // Plugin Runtime
  const pluginLoader = new PluginLoader();
  const pluginRegistry = new PluginRegistry();

  const startTime = Date.now();

  // Workspace Watcher - optional, linked to sessions by cwd
  let watcher: WorkspaceWatcher | null = null;
  if (config.workspaceDir) {
    watcher = new WorkspaceWatcher({ cwd: config.workspaceDir });
    watcher.start();
    watcher.onFileChange((event) => {
      // Find sessions whose cwd matches the changed file
      const sessions = store.listSessions();
      const matchingSession = sessions.find((s) => {
        const sessionCwd = path.resolve(s.cwd);
        const filePath = path.resolve(event.path);
        return filePath.startsWith(sessionCwd) &&
          ['starting', 'running', 'thinking', 'editing', 'testing', 'waiting_input', 'needs_attention', 'paused'].includes(s.status);
      });

      const sessionId = matchingSession?.id ?? '__global__';

      // Store file change
      store.upsertFile(sessionId, event.path, event.changeType, {
        oldPath: event.oldPath,
      });

      // Emit file change event
      const fileEvent = store.appendEvent<WorkspaceFileChangedPayload>(
        sessionId,
        'workspace.file.changed',
        {
          path: event.path,
          changeType: event.changeType,
          oldPath: event.oldPath,
        },
      );
      broadcastEvent(sessionId, fileEvent);

      // Auto-trigger git diff for the matching session
      if (matchingSession) {
        triggerDiffUpdate(matchingSession.id, matchingSession.cwd);
      }
    });
  }

  // Auto-trigger git diff calculation and broadcast
  async function triggerDiffUpdate(sessionId: string, cwd: string): Promise<void> {
    try {
      const isRepo = await diffEngine.isGitRepo(cwd);
      if (!isRepo) return;

      const diff = await diffEngine.getDiffSummary(cwd);

      // Update session git status
      const branchInfo = await diffEngine.getBranchInfo(cwd);
      store.updateSession(sessionId, {
        git: {
          branch: branchInfo.current,
          head: '', // will be filled by branch info
          dirty: diff.filesChanged > 0,
          filesChanged: diff.filesChanged,
          insertions: diff.insertions,
          deletions: diff.deletions,
          untracked: diff.files.filter((f) => f.status === 'untracked').map((f) => f.path),
        },
      });

      // Emit git diff updated event
      const diffEvent = store.appendEvent<GitDiffUpdatedPayload>(
        sessionId,
        'git.diff.updated',
        {
          filesChanged: diff.filesChanged,
          insertions: diff.insertions,
          deletions: diff.deletions,
          files: diff.files.map((f) => ({
            path: f.path,
            status: f.status,
            insertions: f.insertions,
            deletions: f.deletions,
            oldPath: f.oldPath,
          })),
        },
      );
      broadcastEvent(sessionId, diffEvent);

      // Create Smart Card for significant changes
      if (diff.filesChanged > 0) {
        const card = cardFactory.createFileChange(
          sessionId,
          diff.filesChanged,
          diff.insertions,
          diff.deletions,
          diff.files.map((f) => f.path),
        );
        store.saveSmartCard({
          sessionId: card.sessionId,
          kind: card.kind,
          title: card.title,
          summary: card.summary,
          severity: card.severity,
          actions: card.actions,
        });

        const cardEvent = store.appendEvent<ClassifierCardCreatedPayload>(
          sessionId,
          'classifier.card.created',
          {
            cardId: card.id,
            kind: card.kind,
            title: card.title,
            summary: card.summary,
            severity: card.severity,
          },
        );
        broadcastEvent(sessionId, cardEvent);
      }
    } catch {
      // diff calculation may fail for non-git dirs or other issues
    }
  }

  // Integrate OutputClassifier with PTY output
  // The supervisor emits pty.output events via broadcastEvent.
  // We also hook into the store to classify output and create smart cards.
  const originalAppendEvent = store.appendEvent.bind(store);
  const patchStoreAppendEvent = (): void => {
    store.appendEvent = function <T = unknown>(
      sessionId: string,
      type: string,
      payload: T,
    ): BridgeEvent<T> {
      const event = originalAppendEvent(sessionId, type, payload);

      // When PTY output is stored, run classifier
      if (type === 'pty.output') {
        const ptyPayload = payload as { data: string; stream: string };
        const results = classifier.classifyChunk(ptyPayload.data);

        for (const result of results) {
          if (result.status === 'idle') continue;

          // Create smart card from classification
          if (result.cardKind && result.cardTitle) {
            const classification: Classification = {
              kind: result.cardKind as Classification['kind'],
              title: result.cardTitle,
              summary: result.cardSummary,
              severity: result.cardSeverity,
            };
            const card = cardFactory.createFromClassification(sessionId, classification);

            if (card) {
              store.saveSmartCard({
                sessionId: card.sessionId,
                kind: card.kind,
                title: card.title,
                summary: card.summary,
                severity: card.severity,
                actions: card.actions,
              });

              const cardEvent = originalAppendEvent<ClassifierCardCreatedPayload>(
                sessionId,
                'classifier.card.created',
                {
                  cardId: card.id,
                  kind: card.kind,
                  title: card.title,
                  summary: card.summary,
                  severity: card.severity,
                },
              );
              broadcastEvent(sessionId, cardEvent);
            }
          }

          // Update session status based on classification
          const session = store.getSession(sessionId);
          if (session) {
            let newStatus: string | null = null;
            switch (result.status) {
              case 'waiting_input':
              case 'confirmation_prompt':
              case 'question_detected':
                newStatus = 'waiting_input';
                break;
              case 'thinking':
                newStatus = 'thinking';
                break;
              case 'running_command':
                newStatus = 'running';
                break;
              case 'test_started':
              case 'test_passed':
                newStatus = 'testing';
                break;
              case 'test_failed':
              case 'build_failed':
                newStatus = 'needs_attention';
                break;
              case 'file_edited':
                newStatus = 'editing';
                break;
              case 'task_done':
                newStatus = 'completed';
                break;
              case 'error_detected':
                newStatus = 'failed';
                break;
            }

            if (newStatus && newStatus !== session.status) {
              const statusEvent = originalAppendEvent(
                sessionId,
                'session.status.changed',
                { oldStatus: session.status, newStatus, reason: `classifier: ${result.status}` },
              );
              broadcastEvent(sessionId, statusEvent);
              store.updateSession(sessionId, { status: newStatus as BridgeSession['status'] });
            }
          }
        }
      }

      return event;
    };
  };

  // Shared paired device tokens set (used by both routes and ws)
  const pairedDeviceTokens = new Set<string>();

  const deps: RouteDeps = {
    store,
    supervisor,
    diffEngine,
    cardFactory,
    watcher,
    connectionManager,
    networkDoctor,
    pluginRegistry,
    startTime,
    host: config.host,
    port: config.port,
    pairedDeviceTokens,
    recorders,
  };

  const routes = createRoutes(deps);
  app.route('/', routes);

  const staticDir = path.resolve(__dirname, '..', '..', '..', 'apps', 'web', 'dist');
  app.use('/*', serveStatic({ root: staticDir }));

  function init(server: Server): ReturnType<typeof createWsHandler> {
    wsHandler = createWsHandler(server, { store, validTokens: pairedDeviceTokens });

    // Patch store to integrate classifier pipeline
    patchStoreAppendEvent();

    const pluginDirs = config.pluginDirs ?? [path.join(process.cwd(), '.openbrige', 'plugins')];
    const profileDirs = config.profileDirs ?? [
      path.join(process.cwd(), '.openbrige', 'profiles'),
      path.resolve(__dirname, '..', '..', '..', 'plugins', 'profiles'),
    ];

    pluginLoader.loadPlugins(pluginDirs).then((plugins) => {
      for (const plugin of plugins) {
        pluginRegistry.registerPlugin(plugin);
      }
    }).catch(() => {});

    pluginLoader.loadProfiles(profileDirs).then((profiles) => {
      for (const profile of profiles) {
        pluginRegistry.registerProfile(profile);
      }
    }).catch(() => {});

    return wsHandler;
  }

  async function shutdown(): Promise<void> {
    clearInterval(rateLimitCleanup);
    supervisor.destroy();
    if (watcher) {
      await watcher.stop();
    }
    if (wsHandler) {
      wsHandler.destroy();
    }
    store.close();
  }

  return { app, init, shutdown };
}

export interface StartServerResult {
  server: Server;
  shutdown: () => Promise<void>;
}

export interface StartServerOptions extends HostConfig {
  onReady?: (info: { port: number; host: string }) => void;
}

export function startServer(options: StartServerOptions): StartServerResult {
  const { onReady, ...config } = options;
  const { app, init, shutdown } = createHost(config);

  const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
    init(server as unknown as Server);
    onReady?.({ port: info.port, host: config.host });
  });

  return {
    server: server as unknown as Server,
    shutdown: async () => {
      await shutdown();
      server.close();
    },
  };
}
