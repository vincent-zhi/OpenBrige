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
  ok: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
};

// ── Client-side connectivity tests ──────────────────────────

interface ClientTestResult {
  name: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
  message?: string;
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

async function testHttpsCert(): Promise<ClientTestResult> {
  const start = Date.now();
  try {
    const url = `${window.location.protocol}//${window.location.hostname}:${window.location.port || (window.location.protocol === 'https:' ? '443' : '80')}/api/health`;
    const res = await fetch(url, { mode: 'cors' });
    const isHttps = window.location.protocol === 'https:';
    return { name: 'HTTPS Certificate', ok: res.ok, latencyMs: Date.now() - start, message: isHttps ? 'HTTPS certificate valid' : 'Using HTTP (no HTTPS)' };
  } catch (e) {
    return { name: 'HTTPS Certificate', ok: false, latencyMs: -1, message: 'HTTPS certificate check failed' };
  }
}

async function testMdnsFallback(): Promise<ClientTestResult> {
  const start = Date.now();
  try {
    const res = await fetch('http://openbrige.local:7443/api/health', { mode: 'no-cors', signal: AbortSignal.timeout(3000) });
    return { name: 'mDNS Fallback', ok: true, latencyMs: Date.now() - start, message: 'mDNS resolution works' };
  } catch {
    return { name: 'mDNS Fallback', ok: false, latencyMs: -1, message: 'mDNS not available (use IP address instead)' };
  }
}

async function testLanFallback(): Promise<ClientTestResult> {
  const currentHost = window.location.hostname;
  if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(currentHost)) {
    return { name: 'LAN IP Fallback', ok: true, latencyMs: 0, message: `Connected via LAN IP: ${currentHost}` };
  }
  return { name: 'LAN IP Fallback', ok: false, latencyMs: -1, message: 'Not connected via LAN IP' };
}

async function testTunnelStatus(): Promise<ClientTestResult> {
  const start = Date.now();
  try {
    const res = await fetch('/api/connections');
    if (!res.ok) return { name: 'Tunnel Status', ok: false, latencyMs: -1, message: 'Cannot check tunnel status' };
    const data = await res.json();
    const connections = data.connections ?? [];
    const active = connections.filter((c: { status: string }) => c.status === 'connected');
    if (active.length > 0) {
      return { name: 'Tunnel Status', ok: true, latencyMs: Date.now() - start, message: `${active.length} active tunnel(s)` };
    }
    return { name: 'Tunnel Status', ok: false, latencyMs: Date.now() - start, message: 'No active tunnels' };
  } catch {
    return { name: 'Tunnel Status', ok: false, latencyMs: -1, message: 'Tunnel status unavailable' };
  }
}

async function testMDNS(): Promise<ClientTestResult> {
  const start = Date.now();
  try {
    const res = await fetch('/api/connections', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const hasMDNS = data.connections?.some((c: any) => c.type === 'lan-direct' && c.mdns);
    return {
      name: 'mDNS Discovery',
      ok: hasMDNS,
      latencyMs: Date.now() - start,
      message: hasMDNS ? 'mDNS service found' : 'mDNS service not detected',
    };
  } catch (err) {
    return {
      name: 'mDNS Discovery',
      ok: false,
      latencyMs: -1,
      error: 'mDNS not available',
      message: 'mDNS service discovery is not available from browser',
    };
  }
}

async function runClientTests(): Promise<ClientTestResult[]> {
  return Promise.all([testApiPing(), testWebSocket(), testDnsResolution(), testHttpsCert(), testMdnsFallback(), testLanFallback(), testTunnelStatus(), testMDNS()]);
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
        <h2 className="text-xl font-semibold text-fg">Connection Doctor</h2>
        <p className="text-sm text-fg-subtle mt-1">Diagnostics and connectivity status</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-fg-subtle">
          <Loader2 size={20} className="animate-spin mr-2" />
          Running diagnostics...
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Server Diagnostics */}
          <section>
            <h3 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-3">
              Server Diagnostics
            </h3>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-fg-subtle uppercase tracking-wider mb-2">
                  Connections
                </h4>
                {connections.length === 0 ? (
                  <p className="text-sm text-gray-600">No connections configured</p>
                ) : (
                  <div className="space-y-2">
                    {connections.map((conn) => (
                      <div key={conn.id} className="card p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-fg">{conn.provider}</p>
                          <p className="text-xs text-fg-subtle">{conn.mode}</p>
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
                <h4 className="text-xs font-medium text-fg-subtle uppercase tracking-wider mb-2">
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
                              <p className="text-sm font-medium text-fg">{diag.name}</p>
                              <p className="text-sm text-fg-muted mt-0.5">{diag.message}</p>
                              {diag.details && (
                                <pre className="mt-2 text-xs text-fg-subtle font-mono bg-bg rounded p-2 overflow-x-auto">
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
              <h3 className="text-sm font-medium text-fg-muted uppercase tracking-wider">
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
              <div className="flex items-center gap-2 text-sm text-fg-subtle py-4">
                <Loader2 size={16} className="animate-spin" />
                Running client-side tests...
              </div>
            )}

            {clientResults && (
              <div className="space-y-2">
                {clientResults.map((result, i) => {
                  const Icon = result.ok ? CheckCircle2 : XCircle;
                  const color = result.ok ? 'text-green-500' : 'text-red-500';
                  return (
                    <div key={i} className="card p-3">
                      <div className="flex items-start gap-3">
                        <Icon size={18} className={clsx(color, 'shrink-0 mt-0.5')} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-fg">{result.name}</p>
                            <span className={clsx('text-xs font-mono', result.ok ? 'text-green-500' : 'text-red-500')}>
                              {result.latencyMs >= 0 ? `${result.latencyMs}ms` : 'N/A'}
                            </span>
                          </div>
                          <p className="text-sm text-fg-muted mt-0.5">
                            {result.message ?? (result.ok ? 'OK' : 'Failed')}
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
