import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { DiffResult, DiffFile } from '@openbrige/shared-types';
import { isBinaryFile, shouldIgnorePath } from './utils.js';

const LARGE_FILE_THRESHOLD = 100 * 1024; // 100KB

export class GitDiffEngine {
  private fileDiffCache = new Map<string, { diff: DiffFile; timestamp: number }>();

  private async exec(cmd: string, args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(cmd, args, { cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${cmd} ${args.join(' ')}\n${stderr || error.message}`));
          return;
        }
        resolve(stdout);
      });
    });
  }

  clearCache(): void {
    this.fileDiffCache.clear();
  }

  async isGitRepo(cwd: string): Promise<boolean> {
    try {
      await this.exec('git', ['rev-parse', '--is-inside-work-tree'], cwd);
      return true;
    } catch {
      return false;
    }
  }

  async getBranchInfo(cwd: string): Promise<{ current: string; remote: string | null }> {
    const current = (await this.exec('git', ['branch', '--show-current'], cwd)).trim();
    let remote: string | null = null;
    try {
      remote = (await this.exec('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], cwd)).trim();
    } catch {
      // no upstream configured
    }
    return { current, remote };
  }

  async getDiffSummary(cwd: string): Promise<DiffResult> {
    // Invalidate per-file cache when summary is refreshed
    this.fileDiffCache.clear();

    const [numstat, statusOutput] = await Promise.all([
      this.exec('git', ['diff', '--numstat'], cwd),
      this.exec('git', ['status', '--porcelain'], cwd),
    ]);

    const filesMap = new Map<string, DiffFile>();

    for (const line of numstat.split('\n').filter(Boolean)) {
      const [insertions = '0', deletions = '0', ...pathParts] = line.split('\t');
      const filePath = pathParts.join('\t');
      if (!filePath || shouldIgnorePath(filePath)) continue;

      const ins = insertions === '-' ? 0 : parseInt(insertions, 10) || 0;
      const del = deletions === '-' ? 0 : parseInt(deletions, 10) || 0;

      filesMap.set(filePath, {
        path: filePath,
        status: 'modified',
        insertions: ins,
        deletions: del,
        isBinary: isBinaryFile(filePath),
      });
    }

    for (const line of statusOutput.split('\n').filter(Boolean)) {
      const statusCode = line.substring(0, 2).trim();
      const filePath = line.substring(3).trim();
      if (!filePath || shouldIgnorePath(filePath)) continue;

      let status: DiffFile['status'];
      let oldPath: string | undefined;

      if (statusCode === '??') {
        status = 'untracked';
      } else if (statusCode.startsWith('R')) {
        status = 'renamed';
        const parts = filePath.split(' -> ');
        if (parts.length === 2) {
          oldPath = parts[0];
        }
      } else if (statusCode.startsWith('A')) {
        status = 'added';
      } else if (statusCode.startsWith('D')) {
        status = 'deleted';
      } else {
        status = 'modified';
      }

      const existing = filesMap.get(filePath);
      if (existing) {
        existing.status = status;
        if (oldPath) existing.oldPath = oldPath;
      } else {
        filesMap.set(filePath, {
          path: filePath,
          status,
          insertions: 0,
          deletions: 0,
          oldPath,
          isBinary: isBinaryFile(filePath),
        });
      }
    }

    const files = Array.from(filesMap.values());
    const insertions = files.reduce((sum, f) => sum + f.insertions, 0);
    const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

    return {
      filesChanged: files.length,
      insertions,
      deletions,
      files,
      raw: numstat + statusOutput,
    };
  }

  async getFileDiff(cwd: string, filePath: string): Promise<DiffFile> {
    const cacheKey = `${cwd}::${filePath}`;
    const cached = this.fileDiffCache.get(cacheKey);
    if (cached) {
      return cached.diff;
    }

    // Check file size — skip full diff for large files
    try {
      const fullPath = join(cwd, filePath);
      const fileStat = await stat(fullPath).catch(() => null);
      if (fileStat && fileStat.size > LARGE_FILE_THRESHOLD) {
        // Return summary-only DiffFile with isLargeFile flag
        const result: DiffFile = {
          path: filePath,
          status: 'modified',
          insertions: 0,
          deletions: 0,
          isBinary: isBinaryFile(filePath),
          isLargeFile: true,
        };
        // Try to get status info at least
        try {
          const statusOutput = (await this.exec('git', ['status', '--porcelain', '--', filePath], cwd)).trim();
          const statusCode = statusOutput.substring(0, 2).trim();
          if (statusCode === '??') result.status = 'untracked';
          else if (statusCode.startsWith('A')) result.status = 'added';
          else if (statusCode.startsWith('D')) result.status = 'deleted';
          else if (statusCode.startsWith('R')) result.status = 'renamed';
        } catch {
          // fallback to modified
        }
        // Try to get numstat for insertions/deletions
        try {
          const numstat = (await this.exec('git', ['diff', '--numstat', '--', filePath], cwd)).trim();
          if (numstat) {
            const [ins = '0', del = '0'] = numstat.split('\t');
            result.insertions = ins === '-' ? 0 : parseInt(ins, 10) || 0;
            result.deletions = del === '-' ? 0 : parseInt(del, 10) || 0;
          }
        } catch {
          // fallback to 0
        }
        this.fileDiffCache.set(cacheKey, { diff: result, timestamp: Date.now() });
        return result;
      }
    } catch {
      // File may not exist on disk (deleted file), proceed with full diff
    }

    const patch = await this.exec('git', ['diff', '--', filePath], cwd);

    let insertions = 0;
    let deletions = 0;
    for (const line of patch.split('\n')) {
      if (line.startsWith('+') && !line.startsWith('+++')) insertions++;
      if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }

    let status: DiffFile['status'] = 'modified';
    try {
      const statusOutput = (await this.exec('git', ['status', '--porcelain', '--', filePath], cwd)).trim();
      const statusCode = statusOutput.substring(0, 2).trim();
      if (statusCode === '??') status = 'untracked';
      else if (statusCode.startsWith('A')) status = 'added';
      else if (statusCode.startsWith('D')) status = 'deleted';
      else if (statusCode.startsWith('R')) status = 'renamed';
    } catch {
      // fallback to modified
    }

    const result: DiffFile = {
      path: filePath,
      status,
      insertions,
      deletions,
      patch: patch || undefined,
      isBinary: isBinaryFile(filePath),
    };

    this.fileDiffCache.set(cacheKey, { diff: result, timestamp: Date.now() });
    return result;
  }
}
