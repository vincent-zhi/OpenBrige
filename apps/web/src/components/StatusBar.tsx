import type { SessionStatus } from '@openbrige/shared-types';
import clsx from 'clsx';

const statusConfig: Record<SessionStatus, { label: string; className: string }> = {
  starting: { label: 'Starting', className: 'badge-info' },
  thinking: { label: 'Thinking', className: 'badge-thinking' },
  running: { label: 'Running', className: 'badge-info' },
  editing: { label: 'Editing', className: 'badge-info' },
  testing: { label: 'Testing', className: 'badge-info' },
  waiting_input: { label: 'Waiting', className: 'badge-warning' },
  needs_attention: { label: 'Attention', className: 'badge-warning' },
  paused: { label: 'Paused', className: 'badge-warning' },
  completed: { label: 'Completed', className: 'badge-success' },
  failed: { label: 'Failed', className: 'badge-error' },
  aborted: { label: 'Aborted', className: 'badge-error' },
};

interface StatusBarProps {
  status: SessionStatus;
  className?: string;
}

export function StatusBar({ status, className }: StatusBarProps) {
  const config = statusConfig[status] ?? { label: status, className: 'badge-info' };
  return <span className={clsx(config.className, className)}>{config.label}</span>;
}
