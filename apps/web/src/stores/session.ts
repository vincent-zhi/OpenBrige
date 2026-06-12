import { create } from 'zustand';
import type { BridgeSession, BridgeEvent, SmartCard } from '@openbrige/shared-types';
import { idbPut } from '../lib/indexeddb';

interface SessionState {
  sessions: BridgeSession[];
  activeSession: string | null;
  events: Map<string, BridgeEvent[]>;
  cards: Map<string, SmartCard[]>;
  wsState: 'disconnected' | 'connecting' | 'connected';

  setSessions: (sessions: BridgeSession[]) => void;
  updateSession: (session: BridgeSession) => void;
  addEvent: (sessionId: string, event: BridgeEvent) => void;
  setEvents: (sessionId: string, events: BridgeEvent[]) => void;
  setCards: (sessionId: string, cards: SmartCard[]) => void;
  setActiveSession: (id: string | null) => void;
  setWsState: (state: 'disconnected' | 'connecting' | 'connected') => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSession: null,
  events: new Map(),
  cards: new Map(),
  wsState: 'disconnected',

  setSessions: (sessions) => set({ sessions }),

  updateSession: (session) =>
    set((state) => {
      idbPut('sessions', session).catch(() => {});
      return {
        sessions: state.sessions.map((s) => (s.id === session.id ? session : s)),
      };
    }),

  addEvent: (sessionId, event) =>
    set((state) => {
      idbPut('events', event).catch(() => {});
      const MAX_EVENTS = 5000;
      const next = new Map(state.events);
      const list = next.get(sessionId) ?? [];
      const updated = [...list, event];
      const trimmed = updated.length > MAX_EVENTS
        ? updated.slice(updated.length - MAX_EVENTS)
        : updated;
      next.set(sessionId, trimmed);
      return { events: next };
    }),

  setEvents: (sessionId, events) =>
    set((state) => {
      const next = new Map(state.events);
      next.set(sessionId, events);
      return { events: next };
    }),

  setCards: (sessionId, cards) =>
    set((state) => {
      const next = new Map(state.cards);
      next.set(sessionId, cards);
      return { cards: next };
    }),

  setActiveSession: (id) => set({ activeSession: id }),

  setWsState: (wsState) => set({ wsState }),
}));
