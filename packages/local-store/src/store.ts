import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { runMigrations } from './schema.js';
import type {
  BridgeSession,
  SessionStatus,
  WorkspaceMode,
  GitStatus,
  SessionUIHints,
  BridgeEvent,
  EventType,
  SmartCard,
  SmartCardKind,
  SmartCardSeverity,
  CardAction,
  ConnectionInfo,
  ConnectionMode,
} from '@openbrige/shared-types';

interface SessionRow {
  id: string;
  title: string;
  command: string;
  args: string;
  cwd: string;
  status: string;
  transport: string;
  workspace_mode: string;
  profile_id: string | null;
  pid: number | null;
  exit_code: number | null;
  git: string | null;
  ui_hints: string | null;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  session_id: string;
  seq: number;
  type: string;
  payload_json: string;
  created_at: string;
}

interface SmartCardRow {
  id: string;
  session_id: string;
  kind: string;
  title: string;
  summary: string;
  severity: string;
  payload_json: string;
  created_at: string;
}

interface FileRow {
  id: string;
  session_id: string;
  path: string;
  change_type: string;
  last_seen_at: string;
}

interface ConnectionRow {
  id: string;
  provider: string;
  mode: string;
  endpoint: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function now(): string {
  return new Date().toISOString();
}

function toSession(row: SessionRow): BridgeSession {
  return {
    id: row.id,
    title: row.title,
    command: row.command,
    args: JSON.parse(row.args) as string[],
    cwd: row.cwd,
    status: row.status as SessionStatus,
    transport: row.transport as 'pty',
    workspaceMode: row.workspace_mode as WorkspaceMode,
    profileId: row.profile_id ?? undefined,
    pid: row.pid ?? undefined,
    exitCode: row.exit_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    git: row.git ? (JSON.parse(row.git) as GitStatus) : undefined,
    uiHints: row.ui_hints ? (JSON.parse(row.ui_hints) as SessionUIHints) : undefined,
  };
}

function toEvent(row: EventRow): BridgeEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    seq: row.seq,
    type: row.type as EventType,
    payload: JSON.parse(row.payload_json),
    createdAt: row.created_at,
  };
}

function toSmartCard(row: SmartCardRow): SmartCard {
  return {
    id: row.id,
    sessionId: row.session_id,
    kind: row.kind as SmartCardKind,
    title: row.title,
    summary: row.summary,
    severity: row.severity as SmartCardSeverity,
    actions: JSON.parse(row.payload_json) as CardAction[],
    createdAt: row.created_at,
  };
}

export interface StoredFile {
  id: string;
  sessionId: string;
  path: string;
  changeType: 'created' | 'modified' | 'deleted' | 'renamed';
  lastSeenAt: string;
}

function toFile(row: FileRow): StoredFile {
  return {
    id: row.id,
    sessionId: row.session_id,
    path: row.path,
    changeType: row.change_type as StoredFile['changeType'],
    lastSeenAt: row.last_seen_at,
  };
}

function toConnection(row: ConnectionRow): ConnectionInfo {
  return {
    id: row.id,
    provider: row.provider,
    mode: row.mode as ConnectionMode,
    endpoint: row.endpoint ?? undefined,
    status: row.status as ConnectionInfo['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class Store {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    runMigrations(this.db);
  }

  close(): void {
    this.db.close();
  }

  // ── Sessions ─────────────────────────────────────────────

  createSession(
    data: Omit<BridgeSession, 'id' | 'createdAt' | 'updatedAt'>,
  ): BridgeSession {
    const id = nanoid();
    const ts = now();
    this.db
      .prepare(
        `INSERT INTO sessions (id, title, command, args, cwd, status, transport, workspace_mode, profile_id, pid, exit_code, git, ui_hints, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        data.title,
        data.command,
        JSON.stringify(data.args),
        data.cwd,
        data.status,
        data.transport,
        data.workspaceMode,
        data.profileId ?? null,
        data.pid ?? null,
        data.exitCode ?? null,
        data.git ? JSON.stringify(data.git) : null,
        data.uiHints ? JSON.stringify(data.uiHints) : null,
        ts,
        ts,
      );
    return this.getSession(id)!;
  }

  updateSession(
    id: string,
    data: Partial<Omit<BridgeSession, 'id' | 'createdAt' | 'updatedAt'>>,
  ): BridgeSession | null {
    const existing = this.db
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .get(id) as SessionRow | undefined;
    if (!existing) return null;

    const ts = now();
    const merged = {
      title: data.title ?? existing.title,
      command: data.command ?? existing.command,
      args: data.args ?? JSON.parse(existing.args),
      cwd: data.cwd ?? existing.cwd,
      status: data.status ?? existing.status,
      transport: data.transport ?? existing.transport,
      workspaceMode: data.workspaceMode ?? existing.workspace_mode,
      profileId: data.profileId !== undefined ? data.profileId : existing.profile_id,
      pid: data.pid !== undefined ? data.pid : existing.pid,
      exitCode: data.exitCode !== undefined ? data.exitCode : existing.exit_code,
      git: data.git !== undefined ? data.git : existing.git ? JSON.parse(existing.git) : undefined,
      uiHints:
        data.uiHints !== undefined
          ? data.uiHints
          : existing.ui_hints
            ? JSON.parse(existing.ui_hints)
            : undefined,
    };

    this.db
      .prepare(
        `UPDATE sessions SET
          title = ?, command = ?, args = ?, cwd = ?, status = ?, transport = ?,
          workspace_mode = ?, profile_id = ?, pid = ?, exit_code = ?,
          git = ?, ui_hints = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        merged.title,
        merged.command,
        JSON.stringify(merged.args),
        merged.cwd,
        merged.status,
        merged.transport,
        merged.workspaceMode,
        merged.profileId ?? null,
        merged.pid ?? null,
        merged.exitCode ?? null,
        merged.git ? JSON.stringify(merged.git) : null,
        merged.uiHints ? JSON.stringify(merged.uiHints) : null,
        ts,
        id,
      );

    return this.getSession(id);
  }

  getSession(id: string): BridgeSession | null {
    const row = this.db
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .get(id) as SessionRow | undefined;
    return row ? toSession(row) : null;
  }

  listSessions(status?: SessionStatus): BridgeSession[] {
    let stmt: Database.Statement;
    let rows: SessionRow[];
    if (status) {
      stmt = this.db.prepare('SELECT * FROM sessions WHERE status = ? ORDER BY created_at DESC');
      rows = stmt.all(status) as SessionRow[];
    } else {
      stmt = this.db.prepare('SELECT * FROM sessions ORDER BY created_at DESC');
      rows = stmt.all() as SessionRow[];
    }
    return rows.map(toSession);
  }

  // ── Events ───────────────────────────────────────────────

  appendEvent<T = unknown>(
    sessionId: string,
    type: EventType,
    payload: T,
  ): BridgeEvent<T> {
    const id = nanoid();
    const ts = now();

    const maxRow = this.db
      .prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM events WHERE session_id = ?')
      .get(sessionId) as { next_seq: number };

    this.db
      .prepare(
        'INSERT INTO events (id, session_id, seq, type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, sessionId, maxRow.next_seq, type, JSON.stringify(payload), ts);

    return {
      id,
      sessionId,
      seq: maxRow.next_seq,
      type,
      payload,
      createdAt: ts,
    };
  }

  getEvents(sessionId: string, afterSeq?: number, limit?: number): BridgeEvent[] {
    const effectiveLimit = limit ?? 1000;
    let stmt: Database.Statement;
    let rows: EventRow[];
    if (afterSeq !== undefined) {
      stmt = this.db.prepare(
        'SELECT * FROM events WHERE session_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?',
      );
      rows = stmt.all(sessionId, afterSeq, effectiveLimit) as EventRow[];
    } else {
      stmt = this.db.prepare(
        'SELECT * FROM events WHERE session_id = ? ORDER BY seq ASC LIMIT ?',
      );
      rows = stmt.all(sessionId, effectiveLimit) as EventRow[];
    }
    return rows.map(toEvent);
  }

  getEventCursor(sessionId: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM events WHERE session_id = ?')
      .get(sessionId) as { seq: number };
    return row.seq;
  }

  // ── Smart Cards ──────────────────────────────────────────

  saveSmartCard(
    data: Omit<SmartCard, 'id' | 'createdAt'>,
  ): SmartCard {
    const id = nanoid();
    const ts = now();
    this.db
      .prepare(
        `INSERT INTO smart_cards (id, session_id, kind, title, summary, severity, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        data.sessionId,
        data.kind,
        data.title,
        data.summary,
        data.severity,
        JSON.stringify(data.actions),
        ts,
      );
    return {
      id,
      sessionId: data.sessionId,
      kind: data.kind,
      title: data.title,
      summary: data.summary,
      severity: data.severity,
      actions: data.actions,
      createdAt: ts,
    };
  }

  getSmartCards(sessionId: string): SmartCard[] {
    const rows = this.db
      .prepare('SELECT * FROM smart_cards WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as SmartCardRow[];
    return rows.map(toSmartCard);
  }

  // ── Files ────────────────────────────────────────────────

  upsertFile(
    sessionId: string,
    path: string,
    changeType: StoredFile['changeType'],
  ): StoredFile {
    const ts = now();
    const existing = this.db
      .prepare('SELECT * FROM files WHERE session_id = ? AND path = ?')
      .get(sessionId, path) as FileRow | undefined;

    if (existing) {
      this.db
        .prepare(
          `UPDATE files SET change_type = ?, last_seen_at = ? WHERE id = ?`,
        )
        .run(changeType, ts, existing.id);
      return toFile(
        this.db.prepare('SELECT * FROM files WHERE id = ?').get(existing.id) as FileRow,
      );
    }

    const id = nanoid();
    this.db
      .prepare(
        `INSERT INTO files (id, session_id, path, change_type, last_seen_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(id, sessionId, path, changeType, ts);
    return toFile(
      this.db.prepare('SELECT * FROM files WHERE id = ?').get(id) as FileRow,
    );
  }

  getFiles(sessionId: string): StoredFile[] {
    const rows = this.db
      .prepare('SELECT * FROM files WHERE session_id = ? ORDER BY path ASC')
      .all(sessionId) as FileRow[];
    return rows.map(toFile);
  }

  // ── Connections ──────────────────────────────────────────

  saveConnection(
    data: Omit<ConnectionInfo, 'id' | 'createdAt' | 'updatedAt'>,
  ): ConnectionInfo {
    const id = nanoid();
    const ts = now();
    this.db
      .prepare(
        `INSERT INTO connections (id, provider, mode, endpoint, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, data.provider, data.mode, data.endpoint ?? null, data.status, ts, ts);
    return {
      id,
      provider: data.provider,
      mode: data.mode,
      endpoint: data.endpoint,
      status: data.status,
      createdAt: ts,
      updatedAt: ts,
    };
  }

  getConnections(): ConnectionInfo[] {
    const rows = this.db
      .prepare('SELECT * FROM connections ORDER BY created_at DESC')
      .all() as ConnectionRow[];
    return rows.map(toConnection);
  }
}
