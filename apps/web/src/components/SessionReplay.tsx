import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Clock } from 'lucide-react';
import type { BridgeEvent } from '@openbrige/shared-types';
import { formatRelativeTime } from '../lib/format';

interface SessionReplayProps {
  events: BridgeEvent[];
}

const REPLAY_SPEEDS = [0.5, 1, 2, 4, 8];

export function SessionReplay({ events }: SessionReplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentEvent = events[currentIndex] ?? null;
  const progress = events.length > 0 ? ((currentIndex + 1) / events.length) * 100 : 0;

  const advance = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= events.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [events.length]);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const delay = 1000 / speed; // ms per event at given speed
    timerRef.current = setTimeout(advance, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, speed, advance, currentIndex]);

  function handlePlayPause() {
    if (currentIndex >= events.length - 1) {
      // Reset to beginning if at end
      setCurrentIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }

  function handleReset() {
    setIsPlaying(false);
    setCurrentIndex(0);
  }

  function handleSkipForward() {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(prev + 10, events.length - 1));
  }

  function handleSkipBack() {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(prev - 10, 0));
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const idx = Math.floor(pct * events.length);
    setCurrentIndex(Math.max(0, Math.min(idx, events.length - 1)));
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
        No events to replay
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Event display area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {events.slice(0, currentIndex + 1).map((event, i) => (
          <div
            key={event.id}
            className={`flex items-start gap-3 px-3 py-2 rounded text-sm ${
              i === currentIndex ? 'bg-accent/10 border border-accent/20' : ''
            }`}
          >
            <span className="text-xs text-fg-subtle shrink-0 mt-0.5 font-mono">
              {formatRelativeTime(event.createdAt)}
            </span>
            <span className="text-xs font-medium text-accent shrink-0 mt-0.5">
              {event.type}
            </span>
            <span className="text-gray-300 truncate">
              {summarizeEvent(event)}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 bg-bg-hover cursor-pointer mx-4"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="btn-ghost p-1.5" title="Reset">
            <RotateCcw size={16} />
          </button>
          <button onClick={handleSkipBack} className="btn-ghost p-1.5" title="Back 10 events">
            <SkipBack size={16} />
          </button>
          <button onClick={handlePlayPause} className="btn-primary p-2" title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={handleSkipForward} className="btn-ghost p-1.5" title="Forward 10 events">
            <SkipForward size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-fg-subtle">
            <Clock size={12} />
            <span>{currentIndex + 1} / {events.length}</span>
          </div>

          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-bg-surface text-xs text-gray-300 border border-border rounded px-2 py-1"
          >
            {REPLAY_SPEEDS.map((s) => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function summarizeEvent(event: BridgeEvent): string {
  const payload = event.payload as Record<string, unknown>;
  switch (event.type) {
    case 'session.created':
      return `Session started: ${payload.title ?? payload.command ?? ''}`;
    case 'session.status.changed':
      return `${payload.oldStatus} → ${payload.newStatus}`;
    case 'pty.output':
      return (payload.data as string ?? '').slice(0, 100);
    case 'user.input':
      return `Input: ${(payload.text as string ?? '').slice(0, 80)}`;
    case 'process.started':
      return `Process started (PID: ${payload.pid})`;
    case 'process.exited':
      return `Process exited (code: ${payload.exitCode})`;
    case 'workspace.file.changed':
      return `${payload.changeType}: ${payload.path}`;
    case 'git.diff.updated':
      return `${payload.filesChanged} files changed (+${payload.insertions}/-${payload.deletions})`;
    case 'classifier.card.created':
      return `${payload.kind}: ${payload.title}`;
    default:
      return JSON.stringify(payload).slice(0, 100);
  }
}
