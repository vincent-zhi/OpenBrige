export type SessionStatus =
  | 'starting'
  | 'thinking'
  | 'running'
  | 'editing'
  | 'testing'
  | 'waiting_input'
  | 'needs_attention'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'aborted';

export type WorkspaceMode = 'current' | 'worktree' | 'temporary-copy';

export interface BridgeSession {
  id: string;
  title: string;
  command: string;
  args: string[];
  cwd: string;
  status: SessionStatus;
  transport: 'pty';
  workspaceMode: WorkspaceMode;
  profileId?: string;
  pid?: number;
  exitCode?: number | null;
  createdAt: string;
  updatedAt: string;
  git?: GitStatus;
  uiHints?: SessionUIHints;
}

export interface GitStatus {
  branch: string;
  head: string;
  dirty: boolean;
  filesChanged: number;
  insertions: number;
  deletions: number;
  untracked: string[];
}

export interface SessionUIHints {
  agentName?: string;
  agentIcon?: string;
  detectedPrompt?: string;
  lastQuestion?: string;
  suggestedActions?: QuickAction[];
}

export interface QuickAction {
  id: string;
  label: string;
  text: string;
  icon?: string;
  category?: string;
}
