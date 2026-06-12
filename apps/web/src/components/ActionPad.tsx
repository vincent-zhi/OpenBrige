import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Square, Loader2, RotateCcw, ThumbsUp, Bug, FileCode2, GitBranch, Play, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { BridgeSession, QuickAction } from '@openbrige/shared-types';
import { sendInput, stopSession } from '../lib/api';

interface ActionPadProps {
  session: BridgeSession;
}

// Context-aware quick actions based on session status
function getContextActions(session: BridgeSession): QuickAction[] {
  const actions: QuickAction[] = [];

  switch (session.status) {
    case 'running':
    case 'thinking':
    case 'editing':
    case 'testing':
      actions.push(
        { id: 'summarize', label: 'Summarize progress', text: 'Summarize current progress, changed files, test status, and next step.', icon: 'message' },
        { id: 'run_tests', label: 'Run tests', text: 'Run the relevant tests and explain any failures.', icon: 'play' },
        { id: 'stop_editing', label: 'Stop editing', text: 'Stop modifying files. Only summarize from now on.', icon: 'file' },
        { id: 'view_diff', label: 'View diff', text: 'Show me the current diff of all changes.', icon: 'git' },
      );
      break;

    case 'waiting_input':
    case 'needs_attention':
      actions.push(
        { id: 'approve', label: 'Approve', text: 'yes', icon: 'check' },
        { id: 'reject', label: 'Reject', text: 'no', icon: 'alert' },
        { id: 'explain', label: 'Explain first', text: 'Explain what you are about to do before proceeding.', icon: 'message' },
      );
      break;

    case 'completed':
      actions.push(
        { id: 'commit_msg', label: 'Generate commit message', text: 'Generate a concise commit message for all changes made in this session.', icon: 'git' },
        { id: 'pr_desc', label: 'Generate PR description', text: 'Generate a PR description summarizing all changes, rationale, and test results.', icon: 'git' },
        { id: 'export_patch', label: 'Export patch', text: 'Show me the full patch of all changes.', icon: 'file' },
        { id: 'summarize', label: 'Summarize', text: 'Summarize what was done in this session.', icon: 'message' },
        { id: 'merge_sandbox', label: 'Merge sandbox', text: '', icon: 'git' },
        { id: 'delete_sandbox', label: 'Delete sandbox', text: '', icon: 'alert' },
      );
      break;

    case 'failed':
      actions.push(
        { id: 'explain_error', label: 'Explain error', text: 'Explain the error that occurred and suggest how to fix it.', icon: 'alert' },
        { id: 'retry', label: 'Retry', text: 'Try again with the same task, but fix the error first.', icon: 'play' },
        { id: 'summarize', label: 'Summarize', text: 'Summarize what was done before the failure.', icon: 'message' },
        { id: 'rollback', label: 'Rollback last change', text: 'Undo the last change you made and explain what went wrong.', icon: 'alert' },
      );
      break;

    case 'paused':
      actions.push(
        { id: 'resume', label: 'Resume', text: 'continue', icon: 'play' },
        { id: 'summarize', label: 'Summarize', text: 'Summarize current progress so far.', icon: 'message' },
      );
      break;

    default:
      break;
  }

  // Add profile-specific quick actions
  if (session.uiHints?.suggestedActions) {
    actions.push(...session.uiHints.suggestedActions);
  }

  return actions;
}

function getActionIcon(action: QuickAction) {
  switch (action.icon) {
    case 'play': return Play;
    case 'message': return MessageSquare;
    case 'alert': return AlertTriangle;
    case 'check': return CheckCircle2;
    case 'file': return FileCode2;
    case 'git': return GitBranch;
    default: return Send;
  }
}

export function ActionPad({ session }: ActionPadProps) {
  const [input, setInput] = useState('');
  const queryClient = useQueryClient();

  const sendMut = useMutation({
    mutationFn: (text: string) => sendInput(session.id, text),
    onSuccess: () => {
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['events', session.id] });
    },
  });

  const stopMut = useMutation({
    mutationFn: () => stopSession(session.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', session.id] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMut.mutate(text);
  }

  function handleQuickAction(text: string) {
    sendMut.mutate(text);
  }

  const contextActions = getContextActions(session);
  const isRunning = ['running', 'thinking', 'editing', 'testing', 'starting'].includes(
    session.status,
  );
  const canInput = ['waiting_input', 'needs_attention', 'paused', 'running', 'thinking'].includes(session.status);

  return (
    <div className="border-t border-border bg-bg-surface/80 backdrop-blur-sm shrink-0">
      {contextActions.length > 0 && (
        <div className="flex gap-1.5 px-4 pt-3 pb-1 overflow-x-auto">
          {contextActions.map((action) => {
            const Icon = getActionIcon(action);
            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.text)}
                disabled={sendMut.isPending}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
              >
                <Icon size={13} />
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={canInput ? 'Type a message...' : 'Session is not accepting input'}
          disabled={!canInput || sendMut.isPending}
          className="input flex-1"
          data-action-input
        />

        {isRunning && (
          <button
            type="button"
            onClick={() => stopMut.mutate()}
            disabled={stopMut.isPending}
            className="btn-ghost p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Square size={18} />
          </button>
        )}

        <button
          type="submit"
          disabled={!input.trim() || !canInput || sendMut.isPending}
          className="btn-primary p-2.5"
        >
          {sendMut.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
