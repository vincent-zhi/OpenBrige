import { execSync } from 'node:child_process';
import type { AgentManifest } from '@openbrige/shared-types';

export type AgentWithStatus = AgentManifest & { installed: boolean };

/**
 * Detect which agents are installed on the system by checking if any of their
 * detection.commands exist in the system PATH.
 *
 * Uses `which` on Unix or `where` on Windows with a timeout to avoid hanging.
 */
export function detectInstalledAgents(agents: AgentManifest[]): AgentWithStatus[] {
  const isWin = process.platform === 'win32';
  const detectCmd = isWin ? 'where' : 'which';

  return agents.map((agent) => {
    const installed = agent.detection.commands.some((cmd) => commandExists(detectCmd, cmd));
    return { ...agent, installed };
  });
}

/**
 * Check if a single command exists in the system PATH.
 */
function commandExists(detectCmd: string, command: string): boolean {
  try {
    execSync(`${detectCmd} ${command}`, {
      timeout: 5000,
      stdio: 'pipe',
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}
