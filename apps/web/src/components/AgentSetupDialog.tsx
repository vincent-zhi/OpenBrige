import { useState } from 'react';
import { X, Copy, Check, Bot, Terminal, ChevronRight, CheckCircle2, Circle, Wifi } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAgents, fetchSetupCommand } from '../lib/api';

interface AgentSetupDialogProps {
  onClose: () => void;
}

const AGENT_ICONS: Record<string, string> = {
  'claude-code': '🟣',
  'codex': '🔵',
  'aider': '🟢',
  'gemini-cli': '🟠',
  'opencode': '⚪',
  'cursor': '🔷',
  'copilot': '🐙',
  'windsurf': '🌊',
  'cline': '🟧',
  'trae': '⚡',
  'goose': '🦆',
  'roo-code': '🧩',
  'hermes': '🔥',
  'devin': '☁️',
  'replit': '🍊',
  'antigravity': '🚀',
  'continue': '▶️',
};

const TYPE_LABELS: Record<string, string> = {
  'cli-agent': 'CLI',
  'ide-agent': 'IDE',
  'cloud-agent': 'Cloud',
};

export function AgentSetupDialog({ onClose }: AgentSetupDialogProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedInstruction, setCopiedInstruction] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', 'detect'],
    queryFn: () => fetchAgents(true),
  });

  const { data: setupData, isLoading: isLoadingSetup } = useQuery({
    queryKey: ['setup-command', selectedAgent],
    queryFn: () => fetchSetupCommand(selectedAgent!),
    enabled: !!selectedAgent,
  });

  // Sort agents: installed first, then alphabetically
  const sortedAgents = [...agents].sort((a, b) => {
    if (a.installed && !b.installed) return -1;
    if (!a.installed && b.installed) return 1;
    return a.name.localeCompare(b.name);
  });

  const installedCount = agents.filter(a => a.installed).length;

  async function copyToClipboard(text: string, type: 'command' | 'instruction' | 'mcp') {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    if (type === 'command') {
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    } else if (type === 'instruction') {
      setCopiedInstruction(true);
      setTimeout(() => setCopiedInstruction(false), 2000);
    } else {
      setCopiedMcp(true);
      setTimeout(() => setCopiedMcp(false), 2000);
    }
  }

  // Generate MCP config preview for MCP-type agents
  function getMcpConfigPreview(): string | null {
    if (!setupData?.mcpConfig) return null;
    return setupData.mcpConfig;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg mx-4 p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-accent" />
            <h3 className="text-lg font-semibold text-fg">Agent Setup</h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-fg-muted mb-3">
          选择你的 Agent，复制安装指令，粘贴给 Agent 即可自动完成安装和配置。
        </p>

        {installedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-green-400 mb-4">
            <Wifi size={12} />
            <span>已检测到 {installedCount}/{agents.length} 个 Agent 已安装</span>
          </div>
        )}

        {/* Agent Selection */}
        {!selectedAgent ? (
          <div className="space-y-1.5">
            {sortedAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(agent.id);
                  setCopiedCommand(false);
                  setCopiedInstruction(false);
                  setCopiedMcp(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors text-left"
              >
                <span className="text-xl shrink-0">{AGENT_ICONS[agent.id] ?? '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-fg">{agent.name}</span>
                    {agent.type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-fg-muted border border-border">
                        {TYPE_LABELS[agent.type] ?? agent.type}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-fg-muted truncate">{agent.description}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {agent.installed ? (
                    <CheckCircle2 size={16} className="text-green-400" />
                  ) : (
                    <Circle size={16} className="text-fg-subtle" />
                  )}
                  <ChevronRight size={16} className="text-fg-muted" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Back button */}
            <button
              onClick={() => {
                setSelectedAgent(null);
                setCopiedCommand(false);
                setCopiedInstruction(false);
                setCopiedMcp(false);
              }}
              className="text-sm text-accent hover:text-accent-hover transition-colors"
            >
              ← Back to agent list
            </button>

            {/* Selected agent info */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
              <span className="text-xl">{AGENT_ICONS[selectedAgent] ?? '🤖'}</span>
              <div className="flex-1">
                <div className="font-medium text-fg">
                  {agents.find(a => a.id === selectedAgent)?.name ?? selectedAgent}
                </div>
                <div className="text-xs text-fg-muted">
                  {agents.find(a => a.id === selectedAgent)?.description}
                </div>
              </div>
              {agents.find(a => a.id === selectedAgent)?.installed && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Installed
                </span>
              )}
            </div>

            {isLoadingSetup ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent" />
              </div>
            ) : setupData ? (
              <>
                {/* One-liner command */}
                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-1.5">
                    <Terminal size={14} className="inline mr-1" />
                    Install Command (one-liner)
                  </label>
                  <div className="relative">
                    <code className="block p-3 pr-10 rounded-lg bg-bg-base border border-border text-sm text-fg font-mono break-all select-all">
                      {setupData.command}
                    </code>
                    <button
                      onClick={() => copyToClipboard(setupData.command, 'command')}
                      className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-bg-elevated transition-colors"
                      aria-label="Copy command"
                    >
                      {copiedCommand ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} className="text-fg-muted" />
                      )}
                    </button>
                  </div>
                </div>

                {/* MCP Config Preview */}
                {getMcpConfigPreview() && (
                  <div>
                    <label className="block text-sm font-medium text-fg-muted mb-1.5">
                      <Wifi size={14} className="inline mr-1" />
                      MCP Config
                    </label>
                    <div className="relative">
                      <pre className="block p-3 pr-10 rounded-lg bg-bg-base border border-border text-xs text-fg font-mono whitespace-pre-wrap select-all max-h-36 overflow-y-auto">
                        {getMcpConfigPreview()}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(getMcpConfigPreview()!, 'mcp')}
                        className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-bg-elevated transition-colors"
                        aria-label="Copy MCP config"
                      >
                        {copiedMcp ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} className="text-fg-muted" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Full instruction */}
                <div>
                  <label className="block text-sm font-medium text-fg-muted mb-1.5">
                    Full Instruction (for agent)
                  </label>
                  <div className="relative">
                    <pre className="block p-3 pr-10 rounded-lg bg-bg-base border border-border text-sm text-fg whitespace-pre-wrap select-all max-h-48 overflow-y-auto">
                      {setupData.instruction}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(setupData.instruction, 'instruction')}
                      className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-bg-elevated transition-colors"
                      aria-label="Copy instruction"
                    >
                      {copiedInstruction ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} className="text-fg-muted" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Server URL */}
                <div className="text-xs text-fg-muted">
                  Server: <span className="text-fg">{setupData.serverUrl}</span>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
