import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { fetchSessions } from '../lib/api';
import { cacheSessions, getCachedSessions } from '../lib/indexeddb';
import { useSessionStore } from '../stores/session';
import { SessionCard } from '../components/SessionCard';
import { NewSessionModal } from '../components/NewSessionModal';
import type { BridgeSession, SessionStatus } from '@openbrige/shared-types';

const groups: { title: string; statuses: SessionStatus[]; emptyText: string }[] = [
  {
    title: 'Needs Attention',
    statuses: ['waiting_input', 'needs_attention'],
    emptyText: 'No sessions waiting for input',
  },
  {
    title: 'Running',
    statuses: ['starting', 'running', 'thinking', 'editing', 'testing', 'paused'],
    emptyText: 'No active sessions',
  },
  {
    title: 'Completed',
    statuses: ['completed', 'failed', 'aborted'],
    emptyText: 'No completed sessions',
  },
];

export function Inbox() {
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const setActiveSession = useSessionStore((s) => s.setActiveSession);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      try {
        const data = await fetchSessions();
        await cacheSessions(data);
        return data;
      } catch (error) {
        const cached = await getCachedSessions();
        if (cached.length > 0) return cached;
        throw error;
      }
    },
    refetchInterval: 10000,
  });

  const filtered = sessions.filter(
    (s) =>
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.cwd.toLowerCase().includes(search.toLowerCase()),
  );

  function groupSessions(statuses: SessionStatus[]): BridgeSession[] {
    return filtered.filter((s) => statuses.includes(s.status));
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-xl font-semibold text-fg">Inbox</h2>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          <span className="hidden sm:inline">New Session</span>
        </button>
      </div>

      <div className="px-4 py-3 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            aria-label="Search sessions"
            className="input pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-fg-subtle">Loading sessions...</div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => {
              const items = groupSessions(group.statuses);
              return (
                <section key={group.title}>
                  <h3 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-2">
                    {group.title}
                    {items.length > 0 && (
                      <span className="ml-2 text-gray-600">{items.length}</span>
                    )}
                  </h3>
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-600 py-4">{group.emptyText}</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          onClick={() => setActiveSession(session.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {showNew && <NewSessionModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
