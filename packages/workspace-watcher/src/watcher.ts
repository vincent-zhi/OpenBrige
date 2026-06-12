import { watch, type FSWatcher } from 'chokidar';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { EventEmitter } from 'node:events';

export interface FileChangeEvent {
  path: string;
  changeType: 'created' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string;
  timestamp: number;
  isLargeFile?: boolean;
  isBinaryFile?: boolean;
  isSensitiveFile?: boolean;
  fileSize?: number;
}

export interface WorkspaceWatcherOptions {
  cwd: string;
  debounceMs?: number;
  ignorePatterns?: string[];
}

const DEFAULT_IGNORES: string[] = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/__pycache__/**',
];

const LARGE_FILE_THRESHOLD = 1024 * 1024; // 1MB
const BINARY_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg', '.mp4', '.mp3', '.wav', '.avi', '.mov', '.zip', '.tar', '.gz', '.rar', '.7z', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.exe', '.dll', '.so', '.dylib', '.wasm', '.sqlite', '.db'];
const SENSITIVE_PATTERNS = ['.env', 'credentials', 'secret', 'password', 'private-key', 'id_rsa', 'id_ed25519', '.pem', '.key', 'payment', 'infra/'];

export class WorkspaceWatcher {
  private readonly cwd: string;
  private readonly debounceMs: number;
  private readonly ignorePatterns: string[];
  private readonly emitter = new EventEmitter();
  private watcher: FSWatcher | null = null;
  private pendingTimers = new Map<string, ReturnType<typeof globalThis.setTimeout>>();
  private pendingEvents = new Map<string, FileChangeEvent>();

  constructor(options: WorkspaceWatcherOptions) {
    this.cwd = path.resolve(options.cwd);
    this.debounceMs = options.debounceMs ?? 300;
    this.ignorePatterns = [
      ...DEFAULT_IGNORES,
      ...(options.ignorePatterns ?? []),
    ];
  }

  start(): void {
    if (this.watcher) return;

    this.watcher = watch(this.cwd, {
      ignored: this.ignorePatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: false,
    });

    this.watcher.on('add', (filePath: string) => {
      this.enqueue('created', filePath);
    });
    this.watcher.on('change', (filePath: string) => {
      this.enqueue('modified', filePath);
    });
    this.watcher.on('unlink', (filePath: string) => {
      this.enqueue('deleted', filePath);
    });
    this.watcher.on('unlinkDir', (filePath: string) => {
      this.enqueue('deleted', filePath);
    });
    this.watcher.on('error', (error: unknown) => {
      this.emitter.emit('error', error);
    });
  }

  async stop(): Promise<void> {
    for (const timer of this.pendingTimers.values()) {
      globalThis.clearTimeout(timer);
    }
    this.pendingTimers.clear();
    this.pendingEvents.clear();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  onFileChange(callback: (event: FileChangeEvent) => void): () => void {
    this.emitter.on('fileChange', callback);
    return () => {
      this.emitter.off('fileChange', callback);
    };
  }

  getWatchedPaths(): string[] {
    if (!this.watcher) return [];
    const watched = this.watcher.getWatched();
    const paths: string[] = [];
    for (const [dir, entries] of Object.entries(watched)) {
      for (const entry of entries) {
        paths.push(path.join(dir, entry));
      }
    }
    return paths;
  }

  private enqueue(
    changeType: FileChangeEvent['changeType'],
    filePath: string,
  ): void {
    const normalized = path.resolve(filePath);
    const existing = this.pendingTimers.get(normalized);
    if (existing) globalThis.clearTimeout(existing);

    const ext = path.extname(normalized).toLowerCase();
    const isBinaryFile = BINARY_EXTENSIONS.includes(ext);
    const isSensitiveFile = SENSITIVE_PATTERNS.some((p) => normalized.includes(p));

    const event: FileChangeEvent = {
      path: normalized,
      changeType,
      timestamp: Date.now(),
      isBinaryFile: isBinaryFile || undefined,
      isSensitiveFile: isSensitiveFile || undefined,
    };

    if (changeType !== 'deleted') {
      stat(normalized).then((stats) => {
        event.fileSize = stats.size;
        event.isLargeFile = stats.size >= LARGE_FILE_THRESHOLD || undefined;
        this.pendingEvents.set(normalized, event);
      }).catch(() => {
        this.pendingEvents.set(normalized, event);
      });
    } else {
      this.pendingEvents.set(normalized, event);
    }

    this.pendingTimers.set(
      normalized,
      globalThis.setTimeout(() => {
        this.pendingTimers.delete(normalized);
        const flushed = this.pendingEvents.get(normalized);
        this.pendingEvents.delete(normalized);
        if (flushed) this.emitter.emit('fileChange', flushed);
      }, this.debounceMs),
    );
  }
}
