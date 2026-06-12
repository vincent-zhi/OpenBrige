export type EventType =
  | 'session.created'
  | 'session.status.changed'
  | 'session.stopped'
  | 'session.error'
  | 'pty.output'
  | 'user.input'
  | 'process.started'
  | 'process.exited'
  | 'workspace.file.changed'
  | 'git.diff.updated'
  | 'classifier.card.created'
  | 'plugin.event';

export interface BridgeEvent<T = unknown> {
  id: string;
  sessionId: string;
  seq: number;
  type: EventType;
  payload: T;
  createdAt: string;
}

export interface SessionCreatedPayload {
  title: string;
  command: string;
  args: string[];
  cwd: string;
  profileId?: string;
  workspaceMode: string;
}

export interface SessionStatusChangedPayload {
  oldStatus: string;
  newStatus: string;
  reason?: string;
}

export interface PtyOutputPayload {
  data: string;
  stream: 'stdout' | 'stderr';
}

export interface UserInputPayload {
  text: string;
}

export interface ProcessStartedPayload {
  pid: number;
}

export interface ProcessExitedPayload {
  exitCode: number | null;
  signal?: string;
}

export interface WorkspaceFileChangedPayload {
  path: string;
  changeType: 'created' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string;
}

export interface GitDiffUpdatedPayload {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: DiffFileSummary[];
}

export interface DiffFileSummary {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';
  insertions: number;
  deletions: number;
  oldPath?: string;
}

export interface ClassifierCardCreatedPayload {
  cardId: string;
  kind: string;
  title: string;
  summary: string;
  severity: string;
}

export interface PluginEventPayload {
  pluginId: string;
  eventType: string;
  data: Record<string, unknown>;
}
