export interface DiffResult {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: DiffFile[];
  raw: string;
}

export interface DiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';
  insertions: number;
  deletions: number;
  oldPath?: string;
  patch?: string;
  isBinary: boolean;
  isLargeFile?: boolean;
}
