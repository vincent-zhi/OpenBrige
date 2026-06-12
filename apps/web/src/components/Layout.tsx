import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Inbox, UserCircle, Stethoscope, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useSessionStore } from '../stores/session';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: Inbox, label: 'Inbox' },
  { to: '/profiles', icon: UserCircle, label: 'Profiles' },
  { to: '/connection', icon: Stethoscope, label: 'Connection' },
];

function ConnectionIndicator() {
  const wsState = useSessionStore((s) => s.wsState);
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {wsState === 'connected' && (
        <>
          <Wifi size={14} className="text-green-400" />
          <span className="text-green-400 hidden sm:inline">Connected</span>
        </>
      )}
      {wsState === 'connecting' && (
        <>
          <Loader2 size={14} className="text-yellow-400 animate-spin" />
          <span className="text-yellow-400 hidden sm:inline">Connecting</span>
        </>
      )}
      {wsState === 'disconnected' && (
        <>
          <WifiOff size={14} className="text-red-400" />
          <span className="text-red-400 hidden sm:inline">Disconnected</span>
        </>
      )}
    </div>
  );
}

export function Layout() {
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col bg-bg">
      <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-bg-surface/80 backdrop-blur-sm shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">OB</span>
          </div>
          <h1 className="text-lg font-semibold text-white hidden sm:block">OpenBrige</h1>
        </div>
        <ConnectionIndicator />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="hidden md:flex flex-col w-56 border-r border-border bg-bg-surface/50 shrink-0 p-2 gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/15 text-accent-hover'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-bg-elevated',
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      <nav className="md:hidden flex items-center justify-around h-14 border-t border-border bg-bg-surface shrink-0 z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors',
                isActive ? 'text-accent-hover' : 'text-gray-500',
              )
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
