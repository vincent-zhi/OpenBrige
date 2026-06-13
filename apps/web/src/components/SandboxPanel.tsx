import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, GitBranch, Trash2, Download, Merge, FileCode2, AlertTriangle, Loader2, CheckCircle2, XCircle, Copy } from 'lucide-react';
import type { BridgeSession } from '@openbrige/shared-types';
import { exportPatch, mergeSandbox, deleteSandbox } from '../lib/api';

interface SandboxPanelProps {
  session: BridgeSession;
  onTabChange?: (tab: 'cards' | 'diff' | 'files' | 'sandbox' | 'tests') => void;
}

export function SandboxPanel({ session, onTabChange }: SandboxPanelProps) {
  const queryClient = useQueryClient();
  const isSandbox = session.workspaceMode === 'worktree' || session.workspaceMode === 'temporary-copy';

  const [patchLoading, setPatchLoading] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [patchText, setPatchText] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isSandbox) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className="text-fg-subtle" />
          <span className="text-sm font-medium text-gray-300">Sandbox</span>
        </div>
        <p className="text-xs text-fg-subtle">
          This session is running in the main workspace. Enable sandbox mode to isolate changes.
        </p>
      </div>
    );
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleViewDiff() {
    onTabChange?.('diff');
  }

  async function handleGeneratePatch() {
    setPatchLoading(true);
    setMessage(null);
    try {
      const patch = await exportPatch(session.id);
      setPatchText(patch);
      if (!patch.trim()) {
        showMessage('success', 'No changes detected in sandbox.');
      }
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to generate patch');
    } finally {
      setPatchLoading(false);
    }
  }

  async function handleMerge() {
    if (!confirm('Merge sandbox changes into the main workspace? This will apply all changes from the sandbox branch.')) {
      return;
    }
    setMergeLoading(true);
    setMessage(null);
    try {
      await mergeSandbox(session.id);
      showMessage('success', 'Sandbox merged into main workspace successfully.');
      await queryClient.invalidateQueries({ queryKey: ['session', session.id] });
      await queryClient.invalidateQueries({ queryKey: ['diff', session.id] });
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to merge sandbox');
    } finally {
      setMergeLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this sandbox? All unmerged changes will be permanently lost.')) {
      return;
    }
    setDeleteLoading(true);
    setMessage(null);
    try {
      await deleteSandbox(session.id);
      showMessage('success', 'Sandbox deleted successfully.');
      await queryClient.invalidateQueries({ queryKey: ['session', session.id] });
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to delete sandbox');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleCopyPatch() {
    if (!patchText) return;
    try {
      await navigator.clipboard.writeText(patchText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showMessage('error', 'Failed to copy to clipboard');
    }
  }

  return (
    <div className="card p-4 border-accent/20">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={16} className="text-accent" />
        <span className="text-sm font-medium text-accent">Sandbox Active</span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs">
          <GitBranch size={12} className="text-fg-subtle" />
          <span className="text-sm font-medium text-fg-muted">Mode:</span>
          <span className="text-gray-200">{session.workspaceMode === 'worktree' ? 'Git Worktree' : 'Temporary Copy'}</span>
        </div>
        <p className="text-xs text-fg-muted">
          Main workspace is not modified. Changes are isolated in a sandbox.
        </p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded text-xs ${
          message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="space-y-2">
        <button
          className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
          onClick={handleViewDiff}
        >
          <FileCode2 size={13} />
          View Diff
        </button>
        <button
          className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
          onClick={handleGeneratePatch}
          disabled={patchLoading}
        >
          {patchLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Generate Patch
        </button>
        <button
          className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5"
          onClick={handleMerge}
          disabled={mergeLoading}
        >
          {mergeLoading ? <Loader2 size={13} className="animate-spin" /> : <Merge size={13} />}
          Merge to Main Workspace
        </button>
        <button
          className="btn-ghost w-full text-xs py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center gap-1.5"
          onClick={handleDelete}
          disabled={deleteLoading}
        >
          {deleteLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          Delete Sandbox
        </button>
      </div>

      {patchText !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-fg-muted">Patch Output</span>
            <button
              className="text-xs text-fg-subtle hover:text-fg flex items-center gap-1"
              aria-label="Copy patch"
              onClick={handleCopyPatch}
            >
              {copied ? <CheckCircle2 size={11} className="text-green-400" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="bg-black/30 rounded p-2 text-[10px] text-gray-300 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
            {patchText.trim() || '(empty patch - no changes)'}
          </pre>
        </div>
      )}

      <div className="mt-3 flex items-start gap-1.5 text-xs text-yellow-500/80">
        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
        <span>Merge and delete actions require confirmation</span>
      </div>
    </div>
  );
}
