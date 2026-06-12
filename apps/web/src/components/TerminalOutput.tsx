import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react';
import type { BridgeEvent, PtyOutputPayload } from '@openbrige/shared-types';

const MAX_LINE_LENGTH = 500;

interface TerminalOutputProps {
  events: BridgeEvent[];
}

function highlightText(text: string, query: string): ReactNode {
  if (!query) return text;
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const idx = remaining.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) {
      parts.push(remaining);
      break;
    }
    if (idx > 0) parts.push(remaining.slice(0, idx));
    parts.push(
      <mark key={key++} className="bg-yellow-400 text-black rounded-sm px-0.5">
        {remaining.slice(idx, idx + query.length)}
      </mark>
    );
    remaining = remaining.slice(idx + query.length);
  }
  return <>{parts}</>;
}

export function TerminalOutput({ events }: TerminalOutputProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());

  const lines = useMemo(() => {
    const result: { text: string; stream: string }[] = [];
    for (const event of events) {
      if (event.type === 'pty.output') {
        const payload = event.payload as PtyOutputPayload;
        const parts = payload.data.split('\n');
        for (const part of parts) {
          if (part.length > 0) {
            result.push({ text: part, stream: payload.stream });
          }
        }
      }
    }
    return result;
  }, [events]);

  const filteredIndices = useMemo(() => {
    if (!searchQuery) return lines.map((_, i) => i);
    return lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => line.text.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(({ i }) => i);
  }, [lines, searchQuery]);

  const toggleExpand = useCallback((index: number) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const getLineByVirtualIndex = useCallback(
    (virtualIndex: number): { lineIdx: number; line: { text: string; stream: string } } | null => {
      const lineIdx = filteredIndices[virtualIndex];
      if (lineIdx === undefined) return null;
      const line = lines[lineIdx];
      if (!line) return null;
      return { lineIdx, line };
    },
    [filteredIndices, lines],
  );

  const virtualizer = useVirtualizer({
    count: filteredIndices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const entry = getLineByVirtualIndex(index);
      if (!entry) return 20;
      const { lineIdx, line } = entry;
      if (line.text.length > MAX_LINE_LENGTH && !expandedLines.has(lineIdx)) return 20;
      const wrapCount = Math.ceil(line.text.length / 120);
      return Math.max(20, wrapCount * 20);
    },
    overscan: 50,
  });

  useEffect(() => {
    if (autoScroll && filteredIndices.length > 0) {
      virtualizer.scrollToIndex(filteredIndices.length - 1, { align: 'end' });
    }
  }, [filteredIndices.length, autoScroll, virtualizer]);

  function handleScroll() {
    const el = parentRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(atBottom);
  }

  const scrollToBottom = useCallback(() => {
    setAutoScroll(true);
    if (filteredIndices.length > 0) {
      virtualizer.scrollToIndex(filteredIndices.length - 1, { align: 'end' });
    }
  }, [virtualizer, filteredIndices.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 bg-bg shrink-0">
        <svg
          className="w-4 h-4 text-gray-400 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search output..."
          className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-500 outline-none"
        />
        {searchQuery && (
          <span className="text-xs text-gray-500 shrink-0">
            {filteredIndices.length}/{lines.length}
          </span>
        )}
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-gray-400 hover:text-gray-200 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Terminal content */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-bg font-mono text-xs"
      >
        {lines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            No terminal output
          </div>
        ) : filteredIndices.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            No matches found
          </div>
        ) : (
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const entry = getLineByVirtualIndex(virtualRow.index);
              if (!entry) return null;
              const { lineIdx, line } = entry;
              const isLong = line.text.length > MAX_LINE_LENGTH;
              const isExpanded = expandedLines.has(lineIdx);
              const displayText = isLong && !isExpanded
                ? line.text.slice(0, MAX_LINE_LENGTH)
                : line.text;

              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    height: `${virtualRow.size}px`,
                  }}
                  className="px-4 whitespace-pre-wrap break-all leading-5"
                >
                  <span
                    className={line.stream === 'stderr' ? 'text-red-400' : 'text-gray-300'}
                  >
                    {highlightText(displayText, searchQuery)}
                  </span>
                  {isLong && (
                    <button
                      onClick={() => toggleExpand(lineIdx)}
                      className="ml-2 text-blue-400 hover:text-blue-300 underline text-xs align-middle"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 shadow-lg transition-colors"
          title="Scroll to bottom"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
}
