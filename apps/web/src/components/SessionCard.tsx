import { useNavigate } from 'react-router-dom';
import type { BridgeSession } from '@openbrige/shared-types';
import { StatusBar } from './StatusBar';
import { Bot, FileCode2, Clock, Shield, HelpCircle, TestTube2, Folder, Zap } from 'lucide-react';
import { formatDistanceToNow } from '../lib/format';

interface SessionCardProps {
  session: BridgeSession;
  onClick?: () => void;
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const navigate = useNavigate();

  function handleClick() {
    onClick?.();
    navigate(`/sessions/${session.id}`);
  }

  const agentIcon = session.uiHints?.agentIcon;
  const agentName = session.uiHints?.agentName ?? session.profileId ?? 'Agent';
  const projectName = session.cwd.split('/').pop() || session.cwd.split('\\').pop() || session.cwd;
  const recentAction = session.uiHints?.lastQuestion ?? session.uiHints?.detectedPrompt;

  return (
    <button
      onClick={handleClick}
      className="card-hover w-full text-left p-3 flex items-center gap-3 group"
    >
      <div className="w-9 h-9 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
        {agentIcon ? (
          <span className="text-base">{agentIcon}</span>
        ) : (
          <Bot size={18} className="text-fg-subtle" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-fg truncate">{session.title}</span>
          <StatusBar status={session.status} className="shrink-0" />
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-fg-subtle">
          <span className="truncate">{agentName}</span>
          <span className="flex items-center gap-1 shrink-0">
            <Folder size={11} />
            {projectName}
          </span>
          {session.git && (
            <span className="flex items-center gap-1 shrink-0">
              <FileCode2 size={11} />
              {session.git.filesChanged} files
            </span>
          )}
          {session.status === 'testing' && (
            <span className="flex items-center gap-1 shrink-0 text-amber-400">
              <TestTube2 size={11} />
              Testing
            </span>
          )}
          {session.status === 'needs_attention' && (
            <span className="flex items-center gap-1 shrink-0 text-red-400">
              <TestTube2 size={11} />
              Tests Failed
            </span>
          )}
          {(session.workspaceMode === 'worktree' || session.workspaceMode === 'temporary-copy') && (
            <span className="flex items-center gap-1 shrink-0 text-blue-400">
              <Shield size={11} />
              Sandbox
            </span>
          )}
          {(session.status === 'waiting_input' || session.status === 'needs_attention') && (
            <span className="flex items-center gap-1 shrink-0 text-yellow-400 animate-pulse">
              <HelpCircle size={11} />
              Needs Input
            </span>
          )}
          <span className="flex items-center gap-1 shrink-0 ml-auto">
            <Clock size={11} />
            {formatDistanceToNow(session.updatedAt)}
          </span>
        </div>
        {recentAction && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600 truncate">
            <Zap size={10} className="shrink-0" />
            <span className="truncate">{recentAction}</span>
          </div>
        )}
      </div>
    </button>
  );
}
