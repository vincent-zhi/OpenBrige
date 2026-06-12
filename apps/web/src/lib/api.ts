import type {
  BridgeSession,
  BridgeEvent,
  SmartCard,
  DiffResult,
  AgentProfile,
  ConnectionInfo,
  DiagnosticResult,
} from '@openbrige/shared-types';

const API_BASE = '/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem('openbrige_token', token);
  } else {
    localStorage.removeItem('openbrige_token');
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  const stored = localStorage.getItem('openbrige_token');
  if (stored) {
    authToken = stored;
    return stored;
  }
  return null;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

// Sessions
export async function fetchSessions(): Promise<BridgeSession[]> {
  const data = await fetchJson<{ sessions: BridgeSession[] }>('/sessions');
  return data.sessions;
}

export async function fetchSession(id: string): Promise<BridgeSession> {
  const data = await fetchJson<{ session: BridgeSession }>(`/sessions/${id}`);
  return data.session;
}

export async function createSession(options: {
  profileId?: string;
  cwd?: string;
  command?: string;
  args?: string[];
  workspaceMode?: string;
}): Promise<BridgeSession> {
  const data = await fetchJson<{ session: BridgeSession }>('/sessions', {
    method: 'POST',
    body: JSON.stringify(options),
  });
  return data.session;
}

export function sendInput(id: string, text: string): Promise<void> {
  return fetchJson(`/sessions/${id}/input`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function stopSession(id: string): Promise<void> {
  return fetchJson(`/sessions/${id}/stop`, { method: 'POST' });
}

// Events
export function fetchEvents(
  id: string,
  cursor?: number,
  limit = 100,
): Promise<{ events: BridgeEvent[]; nextCursor: number | null }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor !== undefined) params.set('cursor', String(cursor));
  return fetchJson(`/sessions/${id}/events?${params}`);
}

// Diff
export async function fetchDiff(id: string): Promise<DiffResult> {
  const data = await fetchJson<{ diff: DiffResult }>(`/sessions/${id}/diff`);
  return data.diff;
}

// Cards
export async function fetchCards(id: string): Promise<SmartCard[]> {
  const data = await fetchJson<{ cards: SmartCard[] }>(`/sessions/${id}/cards`);
  return data.cards;
}

// Files
export async function fetchFiles(id: string): Promise<{ path: string; changeType: string }[]> {
  const data = await fetchJson<{ files: { path: string; changeType: string }[] }>(`/sessions/${id}/files`);
  return data.files;
}

// Pairing
export async function requestPairToken(): Promise<string> {
  const data = await fetchJson<{ token: string; expiresIn: number }>('/pair/token');
  return data.token;
}

export async function pairDevice(token: string, deviceName?: string): Promise<string> {
  const data = await fetchJson<{ deviceToken: string; message: string }>('/pair', {
    method: 'POST',
    body: JSON.stringify({ token, deviceName }),
  });
  setAuthToken(data.deviceToken);
  return data.deviceToken;
}

// Profiles
export async function fetchProfiles(): Promise<AgentProfile[]> {
  const data = await fetchJson<{ profiles: AgentProfile[] }>('/profiles');
  return data.profiles;
}

// Connections
export async function fetchConnections(): Promise<ConnectionInfo[]> {
  const data = await fetchJson<{ connections: ConnectionInfo[] }>('/connections');
  return data.connections;
}

// Doctor
export async function fetchDoctor(): Promise<DiagnosticResult[]> {
  const data = await fetchJson<{ results: DiagnosticResult[] }>('/doctor/connect');
  return data.results;
}
