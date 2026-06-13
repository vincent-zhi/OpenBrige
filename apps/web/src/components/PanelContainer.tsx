import { useRef, useEffect, useState, useCallback } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { BridgeEvent } from '@openbrige/shared-types';

// ---------------------------------------------------------------------------
// Message protocol types
// ---------------------------------------------------------------------------

/** Parent -> iframe: forward a bridge event */
export type OpenBrigeEventMessage = {
  type: 'openbrige-event';
  event: BridgeEvent;
};

/** iframe -> Parent: request an action */
export type OpenBrigeActionMessage = {
  type: 'openbrige-action';
  action: string;
  payload?: unknown;
};

/** iframe -> Parent: ready signal */
export type OpenBrigeReadyMessage = {
  type: 'openbrige-ready';
};

/** iframe -> Parent: API proxy request */
export type OpenBrigeApiMessage = {
  type: 'openbrige-api';
  path: string;
  method?: string;
  body?: unknown;
  requestId: string;
};

/** Parent -> iframe: API response */
export type OpenBrigeApiResponseMessage = {
  type: 'openbrige-api-response';
  requestId: string;
  data?: unknown;
  error?: string;
};

export type OpenBrigeMessage =
  | OpenBrigeEventMessage
  | OpenBrigeActionMessage
  | OpenBrigeReadyMessage
  | OpenBrigeApiMessage
  | OpenBrigeApiResponseMessage;

// ---------------------------------------------------------------------------
// Allowed origins for message validation
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [window.location.origin];

// ---------------------------------------------------------------------------
// PanelContainer component
// ---------------------------------------------------------------------------

interface PanelContainerProps {
  manifest: {
    id: string;
    name: string;
    entry: string;
    permissions?: string[];
  };
  sessionId: string;
  baseUrl?: string;
  /** Bridge events to forward into the iframe */
  events?: BridgeEvent[];
  /** Callback when the iframe sends an action */
  onAction?: (action: string, payload?: unknown) => void;
}

export function PanelContainer({
  manifest,
  sessionId: _sessionId,
  baseUrl = '/api',
  events,
  onAction,
}: PanelContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  // Keep a ref to onAction so the message handler always sees the latest version
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  // -------------------------------------------------------------------------
  // Validate incoming message origin and prefix
  // -------------------------------------------------------------------------

  const isValidMessage = useCallback((e: MessageEvent): boolean => {
    // Validate origin
    if (!ALLOWED_ORIGINS.includes(e.origin)) {
      // For same-origin iframes (src is relative), origin should match
      // For remote iframes, we allow the src origin
      const src = manifest.entry.startsWith('http')
        ? new URL(manifest.entry).origin
        : window.location.origin;
      if (e.origin !== src) return false;
    }

    // Validate message type prefix
    const data = e.data;
    if (!data || typeof data.type !== 'string') return false;
    if (!data.type.startsWith('openbrige-')) return false;

    // Validate source is our iframe
    const iframe = iframeRef.current;
    if (!iframe || e.source !== iframe.contentWindow) return false;

    return true;
  }, [manifest.entry]);

  // -------------------------------------------------------------------------
  // Handle messages from iframe
  // -------------------------------------------------------------------------

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!isValidMessage(e)) return;

      const data = e.data as OpenBrigeMessage;
      const iframe = iframeRef.current;

      switch (data.type) {
        case 'openbrige-ready': {
          setLoading(false);
          setIframeReady(true);
          break;
        }

        case 'openbrige-action': {
          const msg = data as OpenBrigeActionMessage;
          onActionRef.current?.(msg.action, msg.payload);
          break;
        }

        case 'openbrige-api': {
          const msg = data as OpenBrigeApiMessage;
          fetch(`${baseUrl}${msg.path}`, {
            method: msg.method ?? 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: msg.body ? JSON.stringify(msg.body) : undefined,
          })
            .then((r) => r.json())
            .then((result) => {
              iframe?.contentWindow?.postMessage(
                { type: 'openbrige-api-response', requestId: msg.requestId, data: result } as OpenBrigeApiResponseMessage,
                '*',
              );
            })
            .catch((err) => {
              iframe?.contentWindow?.postMessage(
                { type: 'openbrige-api-response', requestId: msg.requestId, error: err.message } as OpenBrigeApiResponseMessage,
                '*',
              );
            });
          break;
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [baseUrl, isValidMessage]);

  // -------------------------------------------------------------------------
  // Forward BridgeEvents to the iframe via postMessage
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!iframeReady || !events || events.length === 0) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    // Forward only the latest event (last in the array) to avoid flooding
    const latestEvent = events[events.length - 1];
    iframe.contentWindow.postMessage(
      { type: 'openbrige-event', event: latestEvent } as OpenBrigeEventMessage,
      '*',
    );
  }, [events, iframeReady]);

  // -------------------------------------------------------------------------
  // Resolve iframe src
  // -------------------------------------------------------------------------

  const src = manifest.entry.startsWith('http')
    ? manifest.entry
    : `/plugins/${manifest.id}/${manifest.entry}`;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <span className="text-sm font-medium text-gray-300">{manifest.name}</span>
        <span className="text-xs text-gray-600">Plugin</span>
        {loading && <Loader2 size={12} className="animate-spin text-gray-500" />}
      </div>
      <div className="flex-1 relative">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/80 z-10">
            <div className="text-center">
              <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={src}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full border-0"
          onLoad={() => {
            // Timeout for ready message, mark loaded anyway
            setTimeout(() => setLoading(false), 2000);
          }}
          onError={() => setError('Failed to load panel')}
          title={manifest.name}
        />
      </div>
    </div>
  );
}
