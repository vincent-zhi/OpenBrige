import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";

const execFileAsync = promisify(execFile);

export interface WorktreeInfo {
  path: string;
  head: string;
  branch: string;
  sessionId?: string;
}

export class WorktreeManager {
  getWorktreePath(cwd: string, sessionId: string): string {
    return path.join(cwd, ".openbrige", "worktrees", sessionId);
  }

  async isGitRepo(cwd: string): Promise<boolean> {
    try {
      await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], {
        cwd,
      });
      return true;
    } catch {
      return false;
    }
  }

  async createWorktree(cwd: string, sessionId: string): Promise<WorktreeInfo> {
    const worktreePath = this.getWorktreePath(cwd, sessionId);
    const branchName = `openbrige/${sessionId}`;

    await fs.mkdir(path.dirname(worktreePath), { recursive: true });

    try {
      await execFileAsync(
        "git",
        ["worktree", "add", "-b", branchName, worktreePath],
        { cwd }
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("already exists")) {
        await execFileAsync(
          "git",
          ["worktree", "add", worktreePath, branchName],
          { cwd }
        );
      } else {
        throw err;
      }
    }

    const { stdout: head } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: worktreePath,
    });

    return {
      path: worktreePath,
      head: head.trim(),
      branch: branchName,
      sessionId,
    };
  }

  async removeWorktree(cwd: string, sessionId: string): Promise<void> {
    const worktreePath = this.getWorktreePath(cwd, sessionId);
    const branchName = `openbrige/${sessionId}`;

    await execFileAsync("git", ["worktree", "remove", "--force", worktreePath], {
      cwd,
    });

    try {
      await execFileAsync("git", ["branch", "-D", branchName], { cwd });
    } catch {
      // branch may not exist if worktree was created differently
    }
  }

  async listWorktrees(cwd: string): Promise<WorktreeInfo[]> {
    const { stdout } = await execFileAsync(
      "git",
      ["worktree", "list", "--porcelain"],
      { cwd }
    );

    const worktrees: WorktreeInfo[] = [];
    let current: Partial<WorktreeInfo> = {};

    for (const line of stdout.split("\n")) {
      if (line.startsWith("worktree ")) {
        if (current.path) {
          worktrees.push(current as WorktreeInfo);
        }
        current = { path: line.slice("worktree ".length) };
      } else if (line.startsWith("HEAD ")) {
        current.head = line.slice("HEAD ".length);
      } else if (line.startsWith("branch ")) {
        const branch = line.slice("branch ".length);
        current.branch = branch;
        const match = branch.match(/openbrige\/(.+)$/);
        if (match) {
          current.sessionId = match[1];
        }
      } else if (line === "" && current.path) {
        worktrees.push(current as WorktreeInfo);
        current = {};
      }
    }

    if (current.path) {
      worktrees.push(current as WorktreeInfo);
    }

    return worktrees;
  }

  async mergeWorktree(cwd: string, sessionId: string): Promise<void> {
    const branchName = `openbrige/${sessionId}`;

    await execFileAsync("git", ["merge", branchName], { cwd });
  }

  async hasWorktree(cwd: string, sessionId: string): Promise<boolean> {
    const worktreePath = this.getWorktreePath(cwd, sessionId);
    try {
      await fs.access(worktreePath);
      return true;
    } catch {
      return false;
    }
  }

  async generatePatch(cwd: string, sessionId: string): Promise<string> {
    const worktreePath = this.getWorktreePath(cwd, sessionId);

    const { stdout: tracked } = await execFileAsync(
      "git",
      ["diff", "HEAD"],
      { cwd: worktreePath }
    );

    const { stdout: untracked } = await execFileAsync(
      "git",
      ["diff", "--no-index", "/dev/null", "."],
      { cwd: worktreePath }
    ).catch((e: unknown) => ({ stdout: (e as { stdout?: string }).stdout ?? "", stderr: "" }));

    let patch = "";
    if (tracked.trim()) {
      patch += tracked;
    }
    if (untracked.trim() && !untracked.includes("does not exist in the index")) {
      if (patch) patch += "\n";
      patch += untracked;
    }

    return patch;
  }
}
