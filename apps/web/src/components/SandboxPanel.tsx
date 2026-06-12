import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, GitBranch, Trash2, Download, Merge, FileCode2, AlertTriangle } from 'lucide-react';
import type { BridgeSession } from '@openbrige/shared-types';

interface SandboxPanelProps {
  session: BridgeSession;
}

export function SandboxPanel({ session }: SandboxPanelProps) {
  const queryClient = useQueryClient();
  const isSandbox = session.workspaceMode === 'worktree' || session.workspaceMode === 'temporary-copy';

  if (!isSandbox) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-300">Sandbox</span>
        </div>
        <p className="text-xs text-gray-500">
          This session is running in the main workspace. Enable sandbox mode to isolate changes.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 border-accent/20">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={16} className="text-accent" />
        <span className="text-sm font-medium text-accent">Sandbox Active</span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs">
          <GitBranch size={12} className="text-gray-500" />
          <span className="text-gray-400">Mode:</span>
          <span className="text-gray-200">{session.workspaceMode === 'worktree' ? 'Git Worktree' : 'Temporary Copy'}</span>
        </div>
        <p className="text-xs text-gray-400">
          Main workspace is not modified. Changes are isolated in a sandbox.
        </p>
      </div>

      <div className="space-y-2">
        <button
          className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
          onClick={() => {
            /* Navigate to diff tab */
          }}
        >
          <FileCode2 size={13} />
          View Diff
        </button>
        <button
          className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
          onClick={() => {
            /* Generate patch */
          }}
        >
          <Download size={13} />
          Generate Patch
        </button>
        <button
          className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5"
          onClick={() => {
            if (confirm('Merge sandbox changes into the main workspace?')) {
              /* Merge */
            }
          }}
        >
          <Merge size={13} />
          Merge to Main Workspace
        </button>
        <button
          className="btn-ghost w-full text-xs py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center gap-1.5"
          onClick={() => {
            if (confirm('Delete this sandbox? All changes will be lost.')) {
              /* Delete */
            }
          }}
        >
          <Trash2 size={13} />
          Delete Sandbox
        </button>
      </div>

      <div className="mt-3 flex items-start gap-1.5 text-xs text-yellow-500/80">
        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
        <span>Merge and delete actions require confirmation</span>
      </div>
    </div>
  );
}
