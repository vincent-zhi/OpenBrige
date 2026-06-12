import type { QuickAction } from './session.js';

export interface AgentProfile {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd: string;
  icon: string;
  description?: string;
  startup: {
    wait_for_patterns: string[];
  };
  ui: {
    color: string;
  };
  patterns: Record<string, string[]>;
  quick_actions: Record<string, QuickAction>;
}

export interface ProfileManifest {
  version: string;
  profiles: AgentProfile[];
}
