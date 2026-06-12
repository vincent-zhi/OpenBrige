import { useQuery } from '@tanstack/react-query';
import { fetchProfiles } from '../lib/api';
import { Bot, Terminal } from 'lucide-react';

export function Profiles() {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading profiles...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xl font-semibold text-white">Profiles</h2>
        <p className="text-sm text-gray-500 mt-1">Available agent configurations</p>
      </div>

      <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="card-hover p-4"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${profile.ui.color}20` }}
              >
                {profile.icon ? (
                  <span className="text-lg">{profile.icon}</span>
                ) : (
                  <Bot size={20} style={{ color: profile.ui.color }} />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate">{profile.name}</h3>
                {profile.description && (
                  <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{profile.description}</p>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <Terminal size={12} />
              <code className="truncate font-mono">
                {profile.command} {profile.args.join(' ')}
              </code>
            </div>

            {Object.keys(profile.quick_actions).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {Object.values(profile.quick_actions)
                  .slice(0, 3)
                  .map((action) => (
                    <span key={action.id} className="badge-info">
                      {action.label}
                    </span>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
