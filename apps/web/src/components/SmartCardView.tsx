import type { SmartCard, CardAction } from '@openbrige/shared-types';
import {
  HelpCircle,
  TestTube,
  FileCode2,
  GitBranch,
  AlertCircle,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Flag,
} from 'lucide-react';
import clsx from 'clsx';

const kindIcons = {
  question: HelpCircle,
  test_result: TestTube,
  file_change: FileCode2,
  diff_summary: GitBranch,
  error: AlertCircle,
  command: Terminal,
  completion: CheckCircle2,
  warning: AlertTriangle,
  checkpoint: Flag,
};

const severityStyles = {
  info: 'border-blue-500/30 bg-blue-500/5',
  success: 'border-green-500/30 bg-green-500/5',
  warning: 'border-yellow-500/30 bg-yellow-500/5',
  error: 'border-red-500/30 bg-red-500/5',
};

const severityIconColors = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
};

interface SmartCardViewProps {
  card: SmartCard;
  onAction?: (action: CardAction) => void;
}

export function SmartCardView({ card, onAction }: SmartCardViewProps) {
  const Icon = kindIcons[card.kind] ?? HelpCircle;

  return (
    <div
      className={clsx(
        'rounded-lg border p-3 transition-colors',
        severityStyles[card.severity] ?? 'border-border bg-bg-surface',
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          size={18}
          className={clsx('shrink-0 mt-0.5', severityIconColors[card.severity] ?? 'text-fg-muted')}
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-fg">{card.title}</h4>
          <p className="text-xs text-fg-muted mt-1">{card.summary}</p>

          {card.actions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {card.actions.map((action, i) => (
                <button
                  key={i}
                  className="btn-secondary text-xs py-2.5 px-3"
                  aria-label={action.label}
                  onClick={() => {
                    if (onAction) {
                      onAction(action);
                    } else if (action.type === 'send_prompt' && action.text) {
                      const el = document.querySelector<HTMLInputElement>('[data-action-input]');
                      if (el) {
                        el.value = action.text;
                        el.focus();
                      }
                    }
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
