import * as pty from 'node-pty';
import type { Store } from '@openbrige/local-store';
import type {
  BridgeSession,
  BridgeEvent,
  SessionStatus,
  SessionCreatedPayload,
  ProcessStartedPayload,
  PtyOutputPayload,
  ProcessExitedPayload,
  SessionStatusChangedPayload,
} from '@openbrige/shared-types';

const FLUSH_INTERVAL_MS = 100;
const FLUSH_THRESHOLD_BYTES = 4096;

export interface SpawnOptions {
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  profileId?: string;
  workspaceMode?: 'current' | 'worktree' | 'temporary-copy';
  title?: string;
}

interface PtyInstance {
  process: pty.IPty;
  sessionId: string;
  buffer: string;
  flushTimer: ReturnType<typeof setInterval> | null;
}

export type EmitFn = (sessionId: string, event: BridgeEvent) => void;

export class PtySupervisor {
  private store: Store;
  private emitFn: EmitFn;
  private instances = new Map<string, PtyInstance>();

  constructor(store: Store, emitFn?: EmitFn) {
    this.store = store;
    this.emitFn = emitFn ?? (() => {});
  }

  async spawn(options: SpawnOptions): Promise<string> {
    const session = this.store.createSession({
      title: options.title ?? options.command,
      command: options.command,
      args: options.args,
      cwd: options.cwd,
      status: 'starting' as SessionStatus,
      transport: 'pty',
      workspaceMode: options.workspaceMode ?? 'current',
      profileId: options.profileId,
    });

    const sessionId = session.id;

    const sessionCreatedEvent = this.store.appendEvent<SessionCreatedPayload>(
      sessionId,
      'session.created',
      {
        title: session.title,
        command: session.command,
        args: session.args,
        cwd: session.cwd,
        profileId: session.profileId,
        workspaceMode: session.workspaceMode,
      },
    );
    this.emitFn(sessionId, sessionCreatedEvent);

    const proc = pty.spawn(options.command, options.args, {
      name: 'xterm-256color',
      cols: options.cols ?? 80,
      rows: options.rows ?? 24,
      cwd: options.cwd,
      env: options.env as Record<string, string> | undefined,
    });

    const instance: PtyInstance = {
      process: proc,
      sessionId,
      buffer: '',
      flushTimer: null,
    };
    this.instances.set(sessionId, instance);

    this.store.updateSession(sessionId, { pid: proc.pid });
    const startedEvent = this.store.appendEvent<ProcessStartedPayload>(
      sessionId,
      'process.started',
      { pid: proc.pid },
    );
    this.emitFn(sessionId, startedEvent);
    this.store.appendEvent<SessionStatusChangedPayload>(
      sessionId,
      'session.status.changed',
      { oldStatus: 'starting', newStatus: 'running' },
    );
    this.store.updateSession(sessionId, { status: 'running' as SessionStatus });

    proc.onData((data: string) => {
      instance.buffer += data;
      if (instance.buffer.length >= FLUSH_THRESHOLD_BYTES) {
        this.flushBuffer(sessionId);
      }
    });

    instance.flushTimer = setInterval(() => {
      if (instance.buffer.length > 0) {
        this.flushBuffer(sessionId);
      }
    }, FLUSH_INTERVAL_MS);

    proc.onExit(({ exitCode, signal }) => {
      this.cleanupInstance(sessionId);

      const exitEvent = this.store.appendEvent<ProcessExitedPayload>(
        sessionId,
        'process.exited',
        { exitCode, signal: signal !== undefined ? String(signal) : undefined },
      );
      this.emitFn(sessionId, exitEvent);

      const newStatus: SessionStatus = exitCode === 0 ? 'completed' : 'failed';
      this.store.appendEvent<SessionStatusChangedPayload>(
        sessionId,
        'session.status.changed',
        { oldStatus: 'running', newStatus, reason: `exit ${exitCode}` },
      );
      this.store.updateSession(sessionId, {
        status: newStatus,
        exitCode,
      });
    });

    return sessionId;
  }

  writeInput(sessionId: string, text: string): void {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new Error(`No active PTY for session ${sessionId}`);
    }
    instance.process.write(text);
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new Error(`No active PTY for session ${sessionId}`);
    }
    instance.process.resize(cols, rows);
  }

  pause(sessionId: string): void {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new Error(`No active PTY for session ${sessionId}`);
    }
    try {
      process.kill(instance.process.pid, 'SIGSTOP');
    } catch {
      throw new Error(`Failed to pause process for session ${sessionId}`);
    }
  }

  resume(sessionId: string): void {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new Error(`No active PTY for session ${sessionId}`);
    }
    try {
      process.kill(instance.process.pid, 'SIGCONT');
    } catch {
      throw new Error(`Failed to resume process for session ${sessionId}`);
    }
  }

  async stop(sessionId: string): Promise<void> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      throw new Error(`No active PTY for session ${sessionId}`);
    }
    this.cleanupInstance(sessionId);
    instance.process.kill();
    const exitedEvent = this.store.appendEvent<ProcessExitedPayload>(
      sessionId,
      'process.exited',
      { exitCode: null, signal: 'SIGTERM' },
    );
    this.emitFn(sessionId, exitedEvent);
    this.store.appendEvent<SessionStatusChangedPayload>(
      sessionId,
      'session.status.changed',
      { oldStatus: 'running', newStatus: 'aborted', reason: 'stopped by user' },
    );
    this.store.updateSession(sessionId, {
      status: 'aborted' as SessionStatus,
      exitCode: null,
    });
  }

  getSession(sessionId: string): BridgeSession | undefined {
    return this.store.getSession(sessionId) ?? undefined;
  }

  listSessions(): BridgeSession[] {
    return this.store.listSessions();
  }

  destroy(): void {
    for (const sessionId of this.instances.keys()) {
      this.cleanupInstance(sessionId);
    }
    for (const instance of this.instances.values()) {
      try {
        instance.process.kill();
      } catch {
        // process may already be dead
      }
    }
    this.instances.clear();
  }

  private flushBuffer(sessionId: string): void {
    const instance = this.instances.get(sessionId);
    if (!instance || instance.buffer.length === 0) return;

    const data = instance.buffer;
    instance.buffer = '';

    const event = this.store.appendEvent<PtyOutputPayload>(
      sessionId,
      'pty.output',
      { data, stream: 'stdout' },
    );
    this.emitFn(sessionId, event);
  }

  private cleanupInstance(sessionId: string): void {
    const instance = this.instances.get(sessionId);
    if (!instance) return;
    if (instance.flushTimer) {
      clearInterval(instance.flushTimer);
      instance.flushTimer = null;
    }
    if (instance.buffer.length > 0) {
      this.flushBuffer(sessionId);
    }
    this.instances.delete(sessionId);
  }
}
