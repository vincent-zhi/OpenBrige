import type { BridgeEvent } from '@openbrige/shared-types';

export interface RecordingEntry {
  event: BridgeEvent;
  timestamp: number;
  wallClock: string;
}

export interface Recording {
  sessionId: string;
  startedAt: string;
  entries: RecordingEntry[];
  metadata: {
    totalEvents: number;
    durationMs: number;
    eventTypes: Record<string, number>;
  };
}

export class SessionRecorder {
  private entries: RecordingEntry[] = [];
  private sessionId: string;
  private startTime: number;
  private startedAt: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = Date.now();
    this.startedAt = new Date().toISOString();
  }

  record(event: BridgeEvent): void {
    this.entries.push({
      event,
      timestamp: Date.now() - this.startTime,
      wallClock: new Date().toISOString(),
    });
  }

  getRecording(): Recording {
    const eventTypes: Record<string, number> = {};
    for (const entry of this.entries) {
      const type = entry.event.type;
      eventTypes[type] = (eventTypes[type] ?? 0) + 1;
    }

    return {
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      entries: this.entries,
      metadata: {
        totalEvents: this.entries.length,
        durationMs: this.entries.length > 0
          ? this.entries[this.entries.length - 1]!.timestamp
          : 0,
        eventTypes,
      },
    };
  }

  exportJSON(): string {
    return JSON.stringify(this.getRecording(), null, 2);
  }

  static fromJSON(json: string): Recording {
    return JSON.parse(json) as Recording;
  }

  reset(): void {
    this.entries = [];
    this.startTime = Date.now();
    this.startedAt = new Date().toISOString();
  }
}
