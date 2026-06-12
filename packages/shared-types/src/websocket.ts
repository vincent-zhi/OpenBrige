export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export interface WsSubscribe {
  type: 'subscribe';
  sessionId?: string;
  cursor?: number;
}

export interface WsEvent {
  type: 'event';
  event: import('./events.js').BridgeEvent;
}

export interface WsBatchEvents {
  type: 'batch';
  events: import('./events.js').BridgeEvent[];
}

export interface WsCursorAck {
  type: 'cursor_ack';
  cursor: number;
}

export interface WsError {
  type: 'error';
  message: string;
}
