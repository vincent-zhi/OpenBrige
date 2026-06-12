import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useState, useCallback } from 'react';
import type { BridgeEvent } from '@openbrige/shared-types';
import {
  Terminal,
  FileCode2,
  GitBranch,
  AlertCircle,
  CheckCircle2,
  Bot,
  Zap,
  MessageSquare,
  HelpCircle,
  TestTube,
  Bookmark,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from '../lib/format';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type TimelineAction = {
  type: 'send_prompt' | 'open_diff' | 'open_output' | 'open_files' | 'bridge_command';
  text?: string;
  command?: string;
};

// ---------------------------------------------------------------------------
// Card type enum
// ---------------------------------------------------------------------------

type CardType =
  | 'user_prompt'
  | 'agent_message'
  | 'terminal_output'
  | 'file_change'
  | 'diff_summary'
  | 'test_result'
  | 'question'
  | 'error'
  | 'checkpoint'
  | 'action'
  | 'completion';

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function getCardType(event: BridgeEvent): CardType {
  if (event.type === 'user.input') return 'user_prompt';
  if (event.type === 'pty.output') return 'terminal_output';
  if (event.type === 'workspace.file.changed') return 'file_change';
  if (event.type === 'git.diff.updated') return 'diff_summary';

  if (event.type === 'classifier.card.created') {
    const p = event.payload as Record<string, unknown>;
    const kind = p.kind as string;
    switch (kind) {
      case 'test_result':
        return 'test_result';
      case 'question':
        return 'question';
      case 'error':
        return 'error';
      case 'completion':
        return 'completion';
      case 'file_change':
        return 'file_change';
      case 'diff_summary':
        return 'diff_summary';
      case 'warning':
        return 'action';
      case 'checkpoint':
        return 'checkpoint';
      case 'command':
        return 'action';
      default:
        return 'agent_message';
    }
  }

  if (event.type === 'session.created') return 'action';
  if (event.type === 'session.status.changed') return 'action';
  if (event.type === 'process.started') return 'action';
  if (event.type === 'process.exited') {
    const p = event.payload as Record<string, unknown>;
    const exitCode = p.exitCode as number | null;
    return exitCode === 0 ? 'completion' : 'error';
  }

  return 'action';
}

// ---------------------------------------------------------------------------
// Visual config per card type
// ---------------------------------------------------------------------------

interface CardVisual {
  icon: typeof Zap;
  borderColor: string;   // left border
  bgColor: string;       // card background
  iconColor: string;
  label: string;
}

const cardVisuals: Record<CardType, CardVisual> = {
  user_prompt: {
    icon: MessageSquare,
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-500/5',
    iconColor: 'text-blue-400',
    label: '用户输入',
  },
  agent_message: {
    icon: Bot,
    borderColor: 'border-l-purple-500',
    bgColor: 'bg-purple-500/5',
    iconColor: 'text-purple-400',
    label: 'Agent 回复',
  },
  terminal_output: {
    icon: Terminal,
    borderColor: 'border-l-gray-500',
    bgColor: 'bg-gray-500/5',
    iconColor: 'text-gray-400',
    label: '终端输出',
  },
  file_change: {
    icon: FileCode2,
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-500/5',
    iconColor: 'text-blue-400',
    label: '文件变更',
  },
  diff_summary: {
    icon: GitBranch,
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-500/5',
    iconColor: 'text-blue-400',
    label: 'Diff 摘要',
  },
  test_result: {
    icon: TestTube,
    borderColor: 'border-l-green-500',
    bgColor: 'bg-green-500/5',
    iconColor: 'text-green-400',
    label: '测试结果',
  },
  question: {
    icon: HelpCircle,
    borderColor: 'border-l-yellow-500',
    bgColor: 'bg-yellow-500/5',
    iconColor: 'text-yellow-400',
    label: '问题',
  },
  error: {
    icon: AlertCircle,
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-500/5',
    iconColor: 'text-red-400',
    label: '错误',
  },
  checkpoint: {
    icon: Bookmark,
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-500/5',
    iconColor: 'text-blue-400',
    label: '检查点',
  },
  action: {
    icon: Zap,
    borderColor: 'border-l-yellow-500',
    bgColor: 'bg-yellow-500/5',
    iconColor: 'text-yellow-400',
    label: '操作',
  },
  completion: {
    icon: CheckCircle2,
    borderColor: 'border-l-green-500',
    bgColor: 'bg-green-500/5',
    iconColor: 'text-green-400',
    label: '完成',
  },
};

// Severity-based overrides for border color (used when severity is present)
const severityBorderColors: Record<string, string> = {
  info: 'border-l-blue-500',
  success: 'border-l-green-500',
  warning: 'border-l-yellow-500',
  error: 'border-l-red-500',
};

// ---------------------------------------------------------------------------
// Action button helper
// ---------------------------------------------------------------------------

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="btn-secondary text-xs py-0.5 px-2"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Timeline component
// ---------------------------------------------------------------------------

interface TimelineProps {
  events: BridgeEvent[];
  onAction?: (action: TimelineAction) => void;
}

export function Timeline({ events, onAction }: TimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const event = events[virtualRow.index];
          if (!event) return null;
          return (
            <div
              key={event.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TimelineCard event={event} onAction={onAction} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimelineCard
// ---------------------------------------------------------------------------

interface TimelineCardProps {
  event: BridgeEvent;
  onAction?: (action: TimelineAction) => void;
}

function TimelineCard({ event, onAction }: TimelineCardProps) {
  const cardType = getCardType(event);
  const visual = cardVisuals[cardType];
  const Icon = visual.icon;
  const p = event.payload as Record<string, unknown>;

  // Allow severity from payload to override border color
  const severity = p.severity as string | undefined;
  const borderColor = severity ? (severityBorderColors[severity] ?? visual.borderColor) : visual.borderColor;

  const handleAction = useCallback(
    (action: TimelineAction) => {
      onAction?.(action);
    },
    [onAction],
  );

  return (
    <div
      className={clsx(
        'mx-3 my-1.5 p-3 rounded-lg border border-border border-l-[3px] transition-colors',
        borderColor,
        visual.bgColor,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon size={16} className={clsx('shrink-0 mt-0.5', visual.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-200 truncate">{visual.label}</span>
            <span className="text-xs text-gray-600 shrink-0">
              {formatDistanceToNow(event.createdAt)}
            </span>
          </div>
          <CardContent cardType={cardType} event={event} onAction={handleAction} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card content renderer per card type
// ---------------------------------------------------------------------------

interface CardContentProps {
  cardType: CardType;
  event: BridgeEvent;
  onAction: (action: TimelineAction) => void;
}

function CardContent({ cardType, event, onAction }: CardContentProps) {
  const p = event.payload as Record<string, unknown>;

  switch (cardType) {
    case 'user_prompt':
      return <UserPromptContent text={p.text as string} />;
    case 'agent_message':
      return <AgentMessageContent title={p.title as string} summary={p.summary as string} />;
    case 'terminal_output':
      return <TerminalOutputContent data={p.data as string} stream={p.stream as string} />;
    case 'file_change':
      return <FileChangeContent event={event} onAction={onAction} />;
    case 'diff_summary':
      return <DiffSummaryContent event={event} onAction={onAction} />;
    case 'test_result':
      return <TestResultContent event={event} onAction={onAction} />;
    case 'question':
      return <QuestionContent event={event} onAction={onAction} />;
    case 'error':
      return <ErrorContent event={event} onAction={onAction} />;
    case 'checkpoint':
      return <CheckpointContent title={p.title as string} summary={p.summary as string} />;
    case 'action':
      return <ActionContent event={event} />;
    case 'completion':
      return <CompletionContent event={event} onAction={onAction} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Individual card content components
// ---------------------------------------------------------------------------

function UserPromptContent({ text }: { text: string }) {
  return (
    <p className="text-xs text-gray-300 mt-1 line-clamp-4 whitespace-pre-wrap">
      {text}
    </p>
  );
}

function AgentMessageContent({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="mt-1">
      {title && <p className="text-xs font-medium text-gray-200">{title}</p>}
      {summary && <p className="text-xs text-gray-400 mt-0.5 line-clamp-4">{summary}</p>}
    </div>
  );
}

function TerminalOutputContent({ data, stream }: { data: string; stream: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const isLong = data.length > 300;

  return (
    <div className="mt-1">
      {stream === 'stderr' && (
        <span className="text-xs text-red-400 mr-1.5">stderr</span>
      )}
      <pre
        className={clsx(
          'text-xs text-gray-400 font-mono whitespace-pre-wrap break-all',
          collapsed && isLong && 'line-clamp-3',
        )}
      >
        {data}
      </pre>
      {isLong && (
        <button
          className="text-xs text-blue-400 hover:text-blue-300 mt-1 flex items-center gap-0.5"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {collapsed ? '展开' : '收起'}
        </button>
      )}
    </div>
  );
}

function FileChangeContent({
  event,
  onAction,
}: {
  event: BridgeEvent;
  onAction: (action: TimelineAction) => void;
}) {
  const p = event.payload as Record<string, unknown>;

  // workspace.file.changed: single file
  if (event.type === 'workspace.file.changed') {
    return (
      <div className="mt-1">
        <p className="text-xs text-gray-400">
          <span className="text-gray-300">{p.changeType as string}</span>{' '}
          <span className="font-mono">{p.path as string}</span>
        </p>
        <div className="flex gap-1.5 mt-2">
          <ActionButton
            label="查看 Diff"
            onClick={() => onAction({ type: 'open_diff' })}
          />
        </div>
      </div>
    );
  }

  // classifier.card.created with kind=file_change
  const summary = p.summary as string;
  return (
    <div className="mt-1">
      {summary && <p className="text-xs text-gray-400 line-clamp-2">{summary}</p>}
      <div className="flex gap-1.5 mt-2">
        <ActionButton
          label="查看 Diff"
          onClick={() => onAction({ type: 'open_diff' })}
        />
      </div>
    </div>
  );
}

function DiffSummaryContent({
  event,
  onAction,
}: {
  event: BridgeEvent;
  onAction: (action: TimelineAction) => void;
}) {
  const p = event.payload as Record<string, unknown>;

  if (event.type === 'git.diff.updated') {
    const filesChanged = p.filesChanged as number;
    const insertions = p.insertions as number;
    const deletions = p.deletions as number;
    return (
      <div className="mt-1">
        <p className="text-xs text-gray-400">
          修改 <span className="text-gray-200">{filesChanged}</span> 个文件，{' '}
          <span className="text-green-400">+{insertions}</span>{' '}
          <span className="text-red-400">-{deletions}</span>
        </p>
        <div className="flex gap-1.5 mt-2">
          <ActionButton
            label="查看 Diff"
            onClick={() => onAction({ type: 'open_diff' })}
          />
        </div>
      </div>
    );
  }

  // classifier.card.created with kind=diff_summary
  const summary = p.summary as string;
  return (
    <div className="mt-1">
      {summary && <p className="text-xs text-gray-400 line-clamp-2">{summary}</p>}
      <div className="flex gap-1.5 mt-2">
        <ActionButton
          label="查看 Diff"
          onClick={() => onAction({ type: 'open_diff' })}
        />
      </div>
    </div>
  );
}

function TestResultContent({
  event,
  onAction,
}: {
  event: BridgeEvent;
  onAction: (action: TimelineAction) => void;
}) {
  const p = event.payload as Record<string, unknown>;
  const title = p.title as string;
  const summary = p.summary as string;
  const severity = p.severity as string;
  const passed = severity === 'success';

  return (
    <div className="mt-1">
      {title && <p className="text-xs font-medium text-gray-200">{title}</p>}
      {summary && <p className="text-xs text-gray-400 mt-0.5 line-clamp-3">{summary}</p>}
      <div className="flex items-center gap-1.5 mt-2">
        <span
          className={clsx(
            'text-xs font-medium',
            passed ? 'text-green-400' : 'text-red-400',
          )}
        >
          {passed ? '✓ 通过' : '✗ 失败'}
        </span>
      </div>
      {!passed && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <ActionButton
            label="查看输出"
            onClick={() => onAction({ type: 'open_output' })}
          />
          <ActionButton
            label="让Agent解释"
            onClick={() => onAction({ type: 'send_prompt', text: '请解释测试失败的原因' })}
          />
          <ActionButton
            label="重新运行"
            onClick={() => onAction({ type: 'bridge_command', command: 'rerun_tests' })}
          />
        </div>
      )}
    </div>
  );
}

function QuestionContent({
  event,
  onAction,
}: {
  event: BridgeEvent;
  onAction: (action: TimelineAction) => void;
}) {
  const p = event.payload as Record<string, unknown>;
  const title = p.title as string;
  const summary = p.summary as string;

  return (
    <div className="mt-1">
      {title && <p className="text-xs font-medium text-gray-200">{title}</p>}
      {summary && <p className="text-xs text-gray-400 mt-0.5 line-clamp-4">{summary}</p>}
      <div className="flex flex-wrap gap-1.5 mt-2">
        <ActionButton
          label="同意"
          onClick={() => onAction({ type: 'send_prompt', text: '同意' })}
        />
        <ActionButton
          label="拒绝"
          onClick={() => onAction({ type: 'send_prompt', text: '拒绝' })}
        />
        <ActionButton
          label="补充说明"
          onClick={() => onAction({ type: 'send_prompt' })}
        />
      </div>
    </div>
  );
}

function ErrorContent({
  event,
  onAction,
}: {
  event: BridgeEvent;
  onAction: (action: TimelineAction) => void;
}) {
  const p = event.payload as Record<string, unknown>;
  let message = '';

  if (event.type === 'process.exited') {
    const exitCode = p.exitCode as number | null;
    const signal = p.signal as string | undefined;
    message = signal
      ? `进程被信号 ${signal} 终止`
      : `进程退出，退出码: ${exitCode}`;
  } else {
    message = (p.title as string) || (p.summary as string) || (p.message as string) || '';
  }

  return (
    <div className="mt-1">
      <p className="text-xs text-red-300 line-clamp-4">{message}</p>
      <div className="flex gap-1.5 mt-2">
        <ActionButton
          label="调试"
          onClick={() => onAction({ type: 'bridge_command', command: 'debug' })}
        />
      </div>
    </div>
  );
}

function CheckpointContent({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="mt-1">
      {title && <p className="text-xs font-medium text-gray-200">{title}</p>}
      {summary && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{summary}</p>}
    </div>
  );
}

function ActionContent({ event }: { event: BridgeEvent }) {
  const p = event.payload as Record<string, unknown>;
  let detail = '';

  switch (event.type) {
    case 'session.created':
      detail = `会话已创建: ${p.title ?? p.command ?? ''}`;
      break;
    case 'session.status.changed':
      detail = `${p.oldStatus} → ${p.newStatus}`;
      break;
    case 'process.started':
      detail = `进程已启动 (PID: ${p.pid ?? '-'})`;
      break;
    default:
      detail = (p.title as string) || (p.summary as string) || '';
  }

  return (
    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{detail}</p>
  );
}

function CompletionContent({
  event,
  onAction,
}: {
  event: BridgeEvent;
  onAction: (action: TimelineAction) => void;
}) {
  const p = event.payload as Record<string, unknown>;
  let summary = '';

  if (event.type === 'process.exited') {
    summary = '进程已完成 (退出码: 0)';
  } else {
    summary = (p.title as string) || (p.summary as string) || '';
  }

  return (
    <div className="mt-1">
      <p className="text-xs text-green-300 line-clamp-3">{summary}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <ActionButton
          label="查看 Diff"
          onClick={() => onAction({ type: 'open_diff' })}
        />
        <ActionButton
          label="生成 Commit"
          onClick={() => onAction({ type: 'bridge_command', command: 'generate_commit' })}
        />
      </div>
    </div>
  );
}
