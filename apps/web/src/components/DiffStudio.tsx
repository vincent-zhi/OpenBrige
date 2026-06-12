import { useState, useMemo } from 'react';
import type { DiffResult, DiffFile } from '@openbrige/shared-types';
import { FileCode2, TestTube2, Settings, BookOpen, ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';
import clsx from 'clsx';

interface DiffStudioProps {
  diff?: DiffResult;
}

// File categorization based on path
type FileCategory = 'business' | 'test' | 'config' | 'docs' | 'other';

function categorizeFile(path: string): FileCategory {
  const lower = path.toLowerCase();
  if (lower.includes('test') || lower.includes('spec') || lower.includes('__tests__')) return 'test';
  if (lower.includes('config') || lower.includes('.rc.') || lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml') || lower.endsWith('.toml')) return 'config';
  if (lower.endsWith('.md') || lower.endsWith('.txt') || lower.includes('doc') || lower.includes('readme')) return 'docs';
  if (lower.includes('src/') || lower.includes('lib/') || lower.includes('app/') || lower.includes('pkg/') || lower.includes('packages/')) return 'business';
  return 'other';
}

const CATEGORY_META: Record<FileCategory, { label: string; icon: typeof FileCode2; color: string }> = {
  business: { label: 'Business Logic', icon: FileCode2, color: 'text-blue-400' },
  test: { label: 'Tests', icon: TestTube2, color: 'text-green-400' },
  config: { label: 'Configuration', icon: Settings, color: 'text-yellow-400' },
  docs: { label: 'Documentation', icon: BookOpen, color: 'text-purple-400' },
  other: { label: 'Other', icon: FileCode2, color: 'text-gray-400' },
};

export function DiffStudio({ diff }: DiffStudioProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<FileCategory>>(new Set(['business', 'test']));

  const grouped = useMemo(() => {
    if (!diff) return null;
    const map = new Map<FileCategory, DiffFile[]>();
    for (const file of diff.files) {
      const cat = categorizeFile(file.path);
      const list = map.get(cat) ?? [];
      list.push(file);
      map.set(cat, list);
    }
    return map;
  }, [diff]);

  if (!diff || !grouped) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
        No diff available
      </div>
    );
  }

  function toggleFile(path: string) {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleCategory(cat: FileCategory) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Sensitive file check
  const sensitivePatterns = ['.env', 'credentials', 'secret', 'payment', 'infra'];
  const hasSensitive = diff.files.some((f) =>
    sensitivePatterns.some((p) => f.path.toLowerCase().includes(p)),
  );

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="card p-3">
        <h4 className="text-sm font-medium text-white mb-2">Change Summary</h4>
        <div className="flex gap-4 text-xs">
          <span className="text-gray-400">
            <span className="text-white font-medium">{diff.filesChanged}</span> files
          </span>
          <span className="text-green-400">
            <Plus size={11} className="inline" /> {diff.insertions}
          </span>
          <span className="text-red-400">
            <Minus size={11} className="inline" /> {diff.deletions}
          </span>
        </div>
        {hasSensitive && (
          <p className="text-xs text-yellow-400 mt-2">
            Sensitive files detected in changes
          </p>
        )}
      </div>

      {/* Grouped file list */}
      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([category, files]) => {
          const meta = CATEGORY_META[category];
          const Icon = meta.icon;
          const catInsertions = files.reduce((s, f) => s + f.insertions, 0);
          const catDeletions = files.reduce((s, f) => s + f.deletions, 0);
          const isExpanded = expandedCategories.has(category);

          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-bg-hover transition-colors"
              >
                {isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                <Icon size={14} className={meta.color} />
                <span className="text-sm font-medium text-gray-300">{meta.label}</span>
                <span className="text-xs text-gray-600">({files.length})</span>
                <span className="ml-auto flex items-center gap-2 text-xs">
                  <span className="text-green-400">+{catInsertions}</span>
                  <span className="text-red-400">-{catDeletions}</span>
                </span>
              </button>

              {isExpanded && (
                <div className="ml-4 space-y-1 mt-1">
                  {files.map((file) => (
                    <DiffFileView
                      key={file.path}
                      file={file}
                      isExpanded={expandedFiles.has(file.path)}
                      onToggle={() => toggleFile(file.path)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DiffFileViewProps {
  file: DiffFile;
  isExpanded: boolean;
  onToggle: () => void;
}

function DiffFileView({ file, isExpanded, onToggle }: DiffFileViewProps) {
  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={14} className="text-gray-500 shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-gray-500 shrink-0" />
        )}
        <FileCode2 size={14} className="text-gray-500 shrink-0" />
        <span className="text-sm text-gray-200 truncate flex-1">{file.path}</span>
        <span className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-green-400">+{file.insertions}</span>
          <span className="text-red-400">-{file.deletions}</span>
        </span>
      </button>

      {isExpanded && file.patch && (
        <div className="border-t border-border">
          <pre className="text-xs font-mono overflow-x-auto p-3 bg-bg leading-5">
            {file.patch.split('\n').map((line, i) => {
              let color = 'text-gray-400';
              if (line.startsWith('+') && !line.startsWith('+++')) color = 'text-green-400';
              else if (line.startsWith('-') && !line.startsWith('---')) color = 'text-red-400';
              else if (line.startsWith('@@')) color = 'text-purple-400';
              return (
                <div key={i} className={clsx(color, 'whitespace-pre')}>
                  {line}
                </div>
              );
            })}
          </pre>
        </div>
      )}
    </div>
  );
}
