import { useRef, useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

interface PanelContainerProps {
  manifest: {
    id: string;
    name: string;
    entry: string;
    permissions?: string[];
  };
  sessionId: string;
  baseUrl?: string;
}

export function PanelContainer({ manifest, sessionId, baseUrl = '/api' }: PanelContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function handleMessage(e: MessageEvent) {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data;
      if (data?.type === 'openbrige-ready') {
        setLoading(false);
      }
      if (data?.type === 'openbrige-api') {
        // Forward API requests from panel to our API
        const { path, method, body, requestId } = data;
        fetch(`${baseUrl}${path}`, {
          method: method ?? 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        })
          .then((r) => r.json())
          .then((result) => {
            iframe.contentWindow?.postMessage(
              { type: 'openbrige-api-response', requestId, data: result },
              '*'
            );
          })
          .catch((err) => {
            iframe.contentWindow?.postMessage(
              { type: 'openbrige-api-response', requestId, error: err.message },
              '*'
            );
          });
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [baseUrl]);

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
