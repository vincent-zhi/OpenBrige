export interface AgentManifest {
  id: string;
  name: string;
  command: string;
  type: 'cli-agent' | 'ide-agent' | 'cloud-agent';
  description: string;
  icon: string;
  color: string;
  detection: {
    commands: string[];       // CLI commands to detect (e.g. ["cursor", "cursor-agent"])
    configFiles: string[];    // Config files that indicate this agent is used (e.g. [".cursor/rules"])
  };
  integration: {
    method: 'mcp' | 'config-inject' | 'instruction';
    mcpConfig?: {
      target: string;         // Path to MCP config file (e.g. ".cursor/mcp.json")
      format: 'mcp-servers' | 'claude-settings';  // Format of MCP config
    };
    fallback?: {
      method: 'config-inject' | 'instruction';
      files: Array<{
        path: string;         // Target file path relative to project root
        template: string;     // Template file name in the agent directory
      }>;
    };
    files?: Array<{
      path: string;
      template: string;
    }>;
  };
  profile: string;  // Path to profile.yaml relative to agent directory
}
