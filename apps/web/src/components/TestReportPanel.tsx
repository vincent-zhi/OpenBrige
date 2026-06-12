import { useQuery } from '@tanstack/react-query';
import { fetchCards } from '../lib/api';
import { CheckCircle2, XCircle, AlertTriangle, TestTube2 } from 'lucide-react';
import clsx from 'clsx';
import type { SmartCard } from '@openbrige/shared-types';

interface TestReportPanelProps {
  sessionId: string;
}

export function TestReportPanel({ sessionId }: TestReportPanelProps) {
  const { data: cards = [] } = useQuery({
    queryKey: ['cards', sessionId],
    queryFn: () => fetchCards(sessionId),
    enabled: !!sessionId,
  });

  const testCards = cards.filter((c) => c.kind === 'test_result');

  if (testCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm">
        <TestTube2 size={24} className="mb-2 text-gray-700" />
        <p>No test results yet</p>
        <p className="text-xs text-gray-700 mt-1">Test results will appear here when detected</p>
      </div>
    );
  }

  const passed = testCards.filter((c) => c.severity === 'success');
  const failed = testCards.filter((c) => c.severity === 'error');

  return (
    <div className="space-y-3 p-3">
      {/* Summary */}
      <div className="card p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white">Test Summary</h4>
          <span className={clsx('text-xs font-medium', failed.length > 0 ? 'text-red-400' : 'text-green-400')}>
            {failed.length > 0 ? `${failed.length} failed` : 'All passed'}
          </span>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-green-400 flex items-center gap-1">
            <CheckCircle2 size={12} /> {passed.length} passed
          </span>
          <span className="text-red-400 flex items-center gap-1">
            <XCircle size={12} /> {failed.length} failed
          </span>
        </div>
      </div>

      {/* Test cards */}
      {testCards.map((card) => (
        <div key={card.id} className={clsx(
          'card p-3 border-l-2',
          card.severity === 'success' ? 'border-l-green-500' : 'border-l-red-500',
        )}>
          <div className="flex items-start gap-2">
            {card.severity === 'success' ? (
              <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{card.title}</p>
              <p className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">{card.summary}</p>
              {card.actions.length > 0 && (
                <div className="flex gap-1.5 mt-2">
                  {card.actions.map((action, i) => (
                    <button key={i} className="btn-secondary text-xs py-1 px-2">
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
