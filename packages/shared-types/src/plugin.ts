export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  type: 'profile' | 'ui-panel' | 'action' | 'notification' | 'connection' | 'policy';
  entry?: string;
  description?: string;
  permissions?: string[];
  placement?: string[];
}

export interface Plugin {
  manifest: PluginManifest;
  basePath: string;
  enabled: boolean;
}

export interface NotificationProvider {
  id: string;
  name: string;
  send(message: NotificationMessage): Promise<void>;
}

export interface NotificationMessage {
  title: string;
  body: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  sessionId?: string;
  url?: string;
}

export interface PolicyRule {
  action: 'worktree.merge' | 'patch.export' | 'git.commit' | 'git.push' | 'script.run' | 'tunnel.open' | 'sensitive.read';
  allow: boolean;
  requireConfirmation?: boolean;
  conditions?: Record<string, unknown>;
}

export interface PolicyPlugin {
  id: string;
  name: string;
  rules: PolicyRule[];
  check(action: PolicyRule['action'], context?: Record<string, unknown>): Promise<{ allowed: boolean; reason?: string }>;
}
