import type { BridgeEvent } from '@openbrige/shared-types';

type EventCallback = (event: BridgeEvent) => void;

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

export class WsClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private deviceToken: string = '';
  private sessionCallbacks = new Map<string, Set<EventCallback>>();
  private globalCallbacks = new Set<EventCallback>();
  private cursor = 0;
  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  onStateChange?: (state: 'disconnected' | 'connecting' | 'connected') => void;

  connect(url: string, token?: string): void {
    this.url = url;
    this.deviceToken = token ?? '';
    this.intentionalClose = false;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.setConnectionState('connecting');
    let wsUrl = this.url.startsWith('ws') ? this.url : `ws://${window.location.host}${this.url}`;
    if (this.deviceToken) {
      const sep = wsUrl.includes('?') ? '&' : '?';
      wsUrl += `${sep}token=${encodeURIComponent(this.deviceToken)}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.setConnectionState('connected');
      this.reconnectDelay = INITIAL_RECONNECT_DELAY;
      this.resubscribe();
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this.handleMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.setConnectionState('disconnected');
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private handleMessage(msg: { type: string; payload?: unknown; event?: BridgeEvent; events?: BridgeEvent[]; cursor?: number }): void {
    switch (msg.type) {
      case 'event':
        if (msg.event) this.emitEvent(msg.event);
        break;
      case 'batch':
        if (msg.events) {
          for (const evt of msg.events) {
            this.emitEvent(evt);
          }
        }
        break;
      case 'cursor_ack':
        if (msg.cursor !== undefined) {
          this.cursor = msg.cursor;
        }
        break;
    }
  }

  private emitEvent(event: BridgeEvent): void {
    this.cursor = Math.max(this.cursor, event.seq);
    for (const cb of this.globalCallbacks) {
      cb(event);
    }
    const sessionCbs = this.sessionCallbacks.get(event.sessionId);
    if (sessionCbs) {
      for (const cb of sessionCbs) {
        cb(event);
      }
    }
  }

  subscribe(sessionId: string, callback: EventCallback): () => void {
    let cbs = this.sessionCallbacks.get(sessionId);
    if (!cbs) {
      cbs = new Set();
      this.sessionCallbacks.set(sessionId, cbs);
    }
    cbs.add(callback);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', sessionId, cursor: this.cursor }));
    }

    return () => {
      cbs!.delete(callback);
      if (cbs!.size === 0) {
        this.sessionCallbacks.delete(sessionId);
      }
    };
  }

  onEvent(callback: EventCallback): () => void {
    this.globalCallbacks.add(callback);
    return () => {
      this.globalCallbacks.delete(callback);
    };
  }

  private resubscribe(): void {
    for (const sessionId of this.sessionCallbacks.keys()) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'subscribe', sessionId, cursor: this.cursor }));
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
    }, this.reconnectDelay);
  }

  private setConnectionState(state: 'disconnected' | 'connecting' | 'connected'): void {
    this.connectionState = state;
    this.onStateChange?.(state);
  }

  getState(): string {
    return this.connectionState;
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.setConnectionState('disconnected');
  }
}

export const wsClient = new WsClient();
