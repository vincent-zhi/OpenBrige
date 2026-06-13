import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'node:http';
import type { Store } from '@openbrige/local-store';
import type { BridgeEvent, WsSubscribe, WsEvent, WsBatchEvents, WsCursorAck, WsError } from '@openbrige/shared-types';

interface Subscriber {
  ws: WebSocket;
  sessionId: string;
  cursor: number;
  batchBuffer: BridgeEvent[];
  flushTimer: ReturnType<typeof setTimeout> | null;
}

export interface WsHandlerDeps {
  store: Store;
  /** Set of valid device tokens (from pairing system) */
  validTokens?: Set<string>;
}

const BATCH_FLUSH_MS = 50;
const MAX_BATCH_SIZE = 50;

export function createWsHandler(server: Server, deps: WsHandlerDeps): {
  wss: WebSocketServer;
  broadcast: (sessionId: string, event: BridgeEvent) => void;
  destroy: () => void;
} {
  const { store, validTokens } = deps;
  const subscribers = new Map<string, Set<Subscriber>>();

  const wss = new WebSocketServer({
    server,
    path: '/ws',
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3,
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024,
      },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10,
      threshold: 256,
    },
    verifyClient: (info, cb) => {
    // Development mode: allow unauthenticated connections
    if (process.env.OPENBRIGE_ALLOW_UNAUTHENTICATED === 'true') {
      cb(true);
      return;
    }

    // Always require a valid token
    const url = new URL(info.req.url ?? '', `http://${info.req.headers.host ?? 'localhost'}`);
    const token = url.searchParams.get('token') ?? info.req.headers['authorization']?.replace('Bearer ', '');
    if (!token || !validTokens?.has(token)) {
      cb(false, 401, 'Unauthorized');
      return;
    }
    cb(true);
  } });

  function sendJson(ws: WebSocket, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  function flushBatch(sub: Subscriber): void {
    if (sub.batchBuffer.length === 0) return;
    const events = [...sub.batchBuffer];
    sub.batchBuffer = [];
    sub.flushTimer = null;

    if (events.length === 1) {
      const firstEvent = events[0];
      if (firstEvent) {
        const msg: WsEvent = { type: 'event', event: firstEvent };
        sendJson(sub.ws, msg);
      }
    } else {
      const msg: WsBatchEvents = { type: 'batch', events };
      sendJson(sub.ws, msg);
    }

    const maxSeq = events.reduce((max, e) => Math.max(max, e.seq), 0);
    sub.cursor = maxSeq;
    const ack: WsCursorAck = { type: 'cursor_ack', cursor: maxSeq };
    sendJson(sub.ws, ack);
  }

  function scheduleFlush(sub: Subscriber): void {
    if (sub.flushTimer) return;
    sub.flushTimer = setTimeout(() => flushBatch(sub), BATCH_FLUSH_MS);
  }

  function addSubscriber(ws: WebSocket, sessionId: string, cursor?: number): void {
    let subs = subscribers.get(sessionId);
    if (!subs) {
      subs = new Set();
      subscribers.set(sessionId, subs);
    }

    const existingEventCursor = store.getEventCursor(sessionId);
    const startCursor = cursor ?? 0;

    const sub: Subscriber = {
      ws,
      sessionId,
      cursor: startCursor,
      batchBuffer: [],
      flushTimer: null,
    };
    subs.add(sub);

    if (startCursor > 0 && startCursor < existingEventCursor) {
      const missed = store.getEvents(sessionId, startCursor);
      if (missed.length > 0) {
        if (missed.length <= MAX_BATCH_SIZE) {
          const msg: WsBatchEvents = { type: 'batch', events: missed };
          sendJson(ws, msg);
        } else {
          for (let i = 0; i < missed.length; i += MAX_BATCH_SIZE) {
            const chunk = missed.slice(i, i + MAX_BATCH_SIZE);
            const msg: WsBatchEvents = { type: 'batch', events: chunk };
            sendJson(ws, msg);
          }
        }
        const lastEvent = missed[missed.length - 1];
        if (lastEvent) {
          sub.cursor = lastEvent.seq;
        }
        const ack: WsCursorAck = { type: 'cursor_ack', cursor: sub.cursor };
        sendJson(ws, ack);
      }
    }
  }

  function removeSubscriber(ws: WebSocket): void {
    for (const [sessionId, subs] of subscribers) {
      for (const sub of subs) {
        if (sub.ws === ws) {
          if (sub.flushTimer) {
            clearTimeout(sub.flushTimer);
            flushBatch(sub);
          }
          subs.delete(sub);
          if (subs.size === 0) {
            subscribers.delete(sessionId);
          }
          break;
        }
      }
    }
  }

  function broadcast(sessionId: string, event: BridgeEvent): void {
    const subs = subscribers.get(sessionId);
    if (!subs) return;

    for (const sub of subs) {
      if (sub.cursor > 0 && event.seq <= sub.cursor) continue;

      sub.batchBuffer.push(event);
      if (sub.batchBuffer.length >= MAX_BATCH_SIZE) {
        flushBatch(sub);
      } else {
        scheduleFlush(sub);
      }
    }
  }

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    const activeSessionSubs = new Set<string>();

    ws.on('message', (raw: Buffer | string) => {
      let msg: unknown;
      try {
        msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf-8'));
      } catch {
        const err: WsError = { type: 'error', message: 'Invalid JSON' };
        sendJson(ws, err);
        return;
      }

      const data = msg as Record<string, unknown>;

      if (data.type === 'subscribe') {
        const sub = data as unknown as WsSubscribe;
        if (!sub.sessionId) {
          const err: WsError = { type: 'error', message: 'sessionId is required for subscribe' };
          sendJson(ws, err);
          return;
        }

        const session = store.getSession(sub.sessionId);
        if (!session) {
          const err: WsError = { type: 'error', message: `Session ${sub.sessionId} not found` };
          sendJson(ws, err);
          return;
        }

        addSubscriber(ws, sub.sessionId, sub.cursor);
        activeSessionSubs.add(sub.sessionId);
      } else if (data.type === 'unsubscribe') {
        const sessionId = data.sessionId as string | undefined;
        if (!sessionId) {
          const err: WsError = { type: 'error', message: 'sessionId is required for unsubscribe' };
          sendJson(ws, err);
          return;
        }

        const subs = subscribers.get(sessionId);
        if (subs) {
          for (const sub of subs) {
            if (sub.ws === ws) {
              if (sub.flushTimer) {
                clearTimeout(sub.flushTimer);
                flushBatch(sub);
              }
              subs.delete(sub);
              break;
            }
          }
          if (subs.size === 0) {
            subscribers.delete(sessionId);
          }
        }
        activeSessionSubs.delete(sessionId);
      } else {
        const err: WsError = { type: 'error', message: `Unknown message type: ${data.type}` };
        sendJson(ws, err);
      }
    });

    ws.on('close', () => {
      removeSubscriber(ws);
    });

    ws.on('error', () => {
      removeSubscriber(ws);
    });
  });

  function destroy(): void {
    for (const subs of subscribers.values()) {
      for (const sub of subs) {
        if (sub.flushTimer) {
          clearTimeout(sub.flushTimer);
        }
      }
    }
    subscribers.clear();
    wss.close();
  }

  return { wss, broadcast, destroy };
}
