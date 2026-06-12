import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { createSession, fetchProfiles } from '../lib/api';
import { useQuery } from '@tanstack/react-query';

interface NewSessionModalProps {
  onClose: () => void;
}

export function NewSessionModal({ onClose }: NewSessionModalProps) {
  const [profileId, setProfileId] = useState('');
  const [cwd, setCwd] = useState('');
  const [command, setCommand] = useState('');
  const [workspaceMode, setWorkspaceMode] = useState<'current' | 'worktree'>('current');
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  });

  const createMut = useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMut.mutate({
      profileId: profileId || undefined,
      cwd: cwd || undefined,
      command: command || undefined,
      workspaceMode,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">New Session</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Profile</label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="input"
            >
              <option value="">Default</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Working Directory</label>
            <input
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="/path/to/project"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Command</label>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Optional custom command"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Workspace Mode</label>
            <div className="flex gap-2">
              {(['current', 'worktree'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWorkspaceMode(mode)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    workspaceMode === mode
                      ? 'bg-accent/20 text-accent-hover border border-accent/30'
                      : 'bg-bg-elevated text-gray-400 border border-border hover:border-border-hover'
                  }`}
                >
                  {mode === 'current' ? 'Current' : 'Worktree'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {createMut.isPending && <Loader2 size={16} className="animate-spin" />}
              Create
            </button>
          </div>

          {createMut.isError && (
            <p className="text-sm text-red-400 mt-2">
              {(createMut.error as Error).message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
