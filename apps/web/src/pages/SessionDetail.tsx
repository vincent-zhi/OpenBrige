import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { fetchSession, fetchSessions, fetchEvents, fetchCards, fetchDiff, fetchFiles } from '../lib/api';
import { wsClient } from '../lib/ws';
import { useSessionStore } from '../stores/session';
import { StatusBar } from '../components/StatusBar';
import { Timeline } from '../components/Timeline';
import { TerminalOutput } from '../components/TerminalOutput';
import { SmartCardView } from '../components/SmartCardView';
import { DiffStudio } from '../components/DiffStudio';
import { ActionPad } from '../components/ActionPad';
import { SessionReplay } from '../components/SessionReplay';
import { SandboxPanel } from '../components/SandboxPanel';
import { TestReportPanel } from '../components/TestReportPanel';
import { ArrowLeft, FileCode2, Layers, Terminal, RotateCcw, Shield, TestTube2, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

type LeftTab = 'timeline' | 'terminal' | 'replay';
type RightTab = 'cards' | 'diff' | 'files' | 'sandbox' | 'tests';

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [leftTab, setLeftTab] = useState<LeftTab>('timeline');
  const [rightTab, setRightTab] = useState<RightTab>('cards');

  const addEvent = useSessionStore((s) => s.addEvent);

  const { data: session } = useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSession(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events', id],
    queryFn: () => fetchEvents(id!),
    enabled: !!id,
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['cards', id],
    queryFn: () => fetchCards(id!),
    enabled: !!id,
  });

  const { data: diff } = useQuery({
    queryKey: ['diff', id],
    queryFn: () => fetchDiff(id!),
    enabled: !!id,
  });

  const { data: files = [] } = useQuery({
    queryKey: ['files', id],
    queryFn: () => fetchFiles(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    const unsub = wsClient.subscribe(id, (event) => {
      addEvent(id, event);
    });
    return unsub;
  }, [id, addEvent]);

  const events = useSessionStore((s) => s.events.get(id ?? '') ?? eventsData?.events ?? []);

  const projectSessions = allSessions.filter((s) => s.cwd === session?.cwd);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading session...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button onClick={() => navigate('/')} className="btn-ghost p-1.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white truncate">{session.title}</h2>
          <p className="text-xs text-gray-500 truncate">{session.cwd}</p>
        </div>
        <StatusBar status={session.status} />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - hidden on mobile */}
        <div className="hidden lg:flex flex-col w-64 border-r border-border overflow-hidden shrink-0">
          <div className="px-3 py-2 border-b border-border shrink-0">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Project Sessions</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {projectSessions.length === 0 ? (
              <p className="text-xs text-gray-600 px-3 py-2">No other sessions</p>
            ) : (
              projectSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/sessions/${s.id}`)}
                  className={clsx(
                    'w-full text-left px-3 py-2 flex items-center gap-2 transition-colors',
                    s.id === id
                      ? 'bg-accent/15 border-l-2 border-accent'
                      : 'hover:bg-white/5 border-l-2 border-transparent',
                  )}
                >
                  <div className="w-6 h-6 rounded bg-bg-elevated flex items-center justify-center shrink-0">
                    {s.uiHints?.agentIcon ? (
                      <span className="text-xs">{s.uiHints.agentIcon}</span>
                    ) : (
                      <Bot size={12} className="text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-xs truncate', s.id === id ? 'text-white font-medium' : 'text-gray-400')}>{s.title}</p>
                    <p className="text-[10px] text-gray-600 truncate">{s.uiHints?.agentName ?? 'Agent'}</p>
                  </div>
                  <StatusBar status={s.status} className="shrink-0" />
                </button>
              ))
            )}
          </div>
          {/* Current session info */}
          <div className="border-t border-border px-3 py-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-bg-elevated flex items-center justify-center shrink-0">
                {session.uiHints?.agentIcon ? (
                  <span className="text-xs">{session.uiHints.agentIcon}</span>
                ) : (
                  <Bot size={12} className="text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium truncate">{session.uiHints?.agentName ?? 'Agent'}</p>
                {session.profileId && (
                  <p className="text-[10px] text-gray-600 truncate">{session.profileId}</p>
                )}
              </div>
            </div>
            {(session.workspaceMode === 'worktree' || session.workspaceMode === 'temporary-copy') && (
              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-blue-400">
                <Shield size={10} />
                Sandbox ({session.workspaceMode === 'worktree' ? 'Worktree' : 'Copy'})
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col border-r border-border overflow-hidden min-w-0">
          <div className="flex gap-1 px-3 py-2 border-b border-border shrink-0">
            {(['timeline', 'terminal', 'replay'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  leftTab === tab
                    ? 'bg-accent/15 text-accent-hover'
                    : 'text-gray-500 hover:text-gray-300',
                )}
              >
                {tab === 'timeline' ? <Layers size={14} /> : tab === 'terminal' ? <Terminal size={14} /> : <RotateCcw size={14} />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {leftTab === 'timeline' ? (
              <Timeline events={events} />
            ) : leftTab === 'terminal' ? (
              <TerminalOutput events={events} />
            ) : (
              <SessionReplay events={events} />
            )}
          </div>
        </div>

        <div className="hidden lg:flex flex-col w-96 overflow-hidden">
          <div className="flex gap-1 px-3 py-2 border-b border-border shrink-0">
            {([
              { key: 'cards' as const, label: 'Cards', icon: Layers },
              { key: 'diff' as const, label: 'Diff', icon: FileCode2 },
              { key: 'files' as const, label: 'Files', icon: FileCode2 },
              { key: 'sandbox' as const, label: 'Sandbox', icon: Shield },
              { key: 'tests' as const, label: 'Tests', icon: TestTube2 },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRightTab(tab.key)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  rightTab === tab.key
                    ? 'bg-accent/15 text-accent-hover'
                    : 'text-gray-500 hover:text-gray-300',
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {rightTab === 'cards' && (
              <div className="space-y-3">
                {cards.length === 0 ? (
                  <p className="text-sm text-gray-600">No cards yet</p>
                ) : (
                  cards.map((card) => <SmartCardView key={card.id} card={card} />)
                )}
              </div>
            )}
            {rightTab === 'diff' && <DiffStudio diff={diff} />}
            {rightTab === 'files' && (
              <div className="space-y-1">
                {files.length === 0 ? (
                  <p className="text-sm text-gray-600">No files changed</p>
                ) : (
                  files.map((f) => (
                    <div key={f.path} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm">
                      <FileCode2 size={14} className="text-gray-500 shrink-0" />
                      <span className="truncate text-gray-300">{f.path}</span>
                      <span className="ml-auto text-xs text-gray-600 shrink-0">{f.changeType}</span>
                    </div>
                  ))
                )}
              </div>
            )}
            {rightTab === 'sandbox' && <SandboxPanel session={session} />}
            {rightTab === 'tests' && <TestReportPanel sessionId={session.id} />}
          </div>
        </div>
      </div>

      <ActionPad session={session} />
    </div>
  );
}
