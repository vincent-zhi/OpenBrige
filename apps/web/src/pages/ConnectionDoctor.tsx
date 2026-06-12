import { useQuery } from '@tanstack/react-query';
import { fetchDoctor, fetchConnections } from '../lib/api';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Play } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

const statusIcons = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const statusColors = {
  ok: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
};

// ── Client-side connectivity tests ──────────────────────────

interface ClientTestResult {
  name: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

async function testApiPing(): Promise<ClientTestResult> {
  const start = Date.now();
  try {
    const res = await fetch('/api/health');
    return { name: 'API Ping', ok: res.ok, latencyMs: Date.now() - start };
  } catch (err) {
    return { name: 'API Ping', ok: false, latencyMs: -1, error: String(err) };
  }
}

async function testWebSocket(): Promise<ClientTestResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ name: 'WebSocket', ok: false, latencyMs: -1, error: 'Connection timed out (5s)' });
    }, 5000);
    ws.onopen = () => {
      clearTimeout(timeout);
      const latency = Date.now() - start;
      ws.close();
      resolve({ name: 'WebSocket', ok: true, latencyMs: latency });
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      resolve({ name: 'WebSocket', ok: false, latencyMs: -1, error: 'Connection failed' });
    };
  });
}

async function testDnsResolution(): Promise<ClientTestResult> {
  const start = Date.now();
  try {
    const res = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
    return { name: 'DNS Resolution', ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { name: 'DNS Resolution', ok: false, latencyMs: -1, error: String(err) };
  }
}

async function runClientTests(): Promise<ClientTestResult[]> {
  return Promise.all([testApiPing(), testWebSocket(), testDnsResolution()]);
}

export function ConnectionDoctor() {
  const { data: diagnostics = [], isLoading: loadingDoctor } = useQuery({
    queryKey: ['doctor'],
    queryFn: fetchDoctor,
  });

  const { data: connections = [], isLoading: loadingConns } = useQuery({
    queryKey: ['connections'],
    queryFn: fetchConnections,
  });

  const isLoading = loadingDoctor || loadingConns;

  const [clientResults, setClientResults] = useState<ClientTestResult[] | null>(null);
  const [clientRunning, setClientRunning] = useState(false);

  const handleRunClientTests = async () => {
    setClientRunning(true);
    setClientResults(null);
    const results = await runClientTests();
    setClientResults(results);
    setClientRunning(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xl font-semibold text-white">Connection Doctor</h2>
        <p className="text-sm text-gray-500 mt-1">Diagnostics and connectivity status</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-500">
          <Loader2 size={20} className="animate-spin mr-2" />
          Running diagnostics...
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Server Diagnostics */}
          <section>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              Server Diagnostics
            </h3>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Connections
                </h4>
                {connections.length === 0 ? (
                  <p className="text-sm text-gray-600">No connections configured</p>
                ) : (
                  <div className="space-y-2">
                    {connections.map((conn) => (
                      <div key={conn.id} className="card p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{conn.provider}</p>
                          <p className="text-xs text-gray-500">{conn.mode}</p>
                        </div>
                        <span
                          className={clsx(
                            'badge',
                            conn.status === 'connected' && 'badge-success',
                            conn.status === 'disconnected' && 'badge-warning',
                            conn.status === 'error' && 'badge-error',
                          )}
                        >
                          {conn.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Diagnostics
                </h4>
                {diagnostics.length === 0 ? (
                  <p className="text-sm text-gray-600">No diagnostics available</p>
                ) : (
                  <div className="space-y-2">
                    {diagnostics.map((diag, i) => {
                      const Icon = statusIcons[diag.status];
                      return (
                        <div key={i} className="card p-3">
                          <div className="flex items-start gap-3">
                            <Icon size={18} className={clsx(statusColors[diag.status], 'shrink-0 mt-0.5')} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">{diag.name}</p>
                              <p className="text-sm text-gray-400 mt-0.5">{diag.message}</p>
                              {diag.details && (
                                <pre className="mt-2 text-xs text-gray-500 font-mono bg-bg rounded p-2 overflow-x-auto">
                                  {diag.details}
                                </pre>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Client Connectivity */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Client Connectivity
              </h3>
              <button
                onClick={handleRunClientTests}
                disabled={clientRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {clientRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Run Client Tests
              </button>
            </div>

            {clientRunning && !clientResults && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Loader2 size={16} className="animate-spin" />
                Running client-side tests...
              </div>
            )}

            {clientResults && (
              <div className="space-y-2">
                {clientResults.map((result, i) => {
                  const Icon = result.ok ? CheckCircle2 : XCircle;
                  const color = result.ok ? 'text-green-400' : 'text-red-400';
                  return (
                    <div key={i} className="card p-3">
                      <div className="flex items-start gap-3">
                        <Icon size={18} className={clsx(color, 'shrink-0 mt-0.5')} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-white">{result.name}</p>
                            <span className={clsx('text-xs font-mono', result.ok ? 'text-green-400' : 'text-red-400')}>
                              {result.latencyMs >= 0 ? `${result.latencyMs}ms` : 'N/A'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {result.ok ? 'OK' : 'Failed'}
                          </p>
                          {result.error && (
                            <p className="text-xs text-red-400 mt-1">{result.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!clientRunning && !clientResults && (
              <p className="text-sm text-gray-600">Click "Run Client Tests" to check browser connectivity</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
