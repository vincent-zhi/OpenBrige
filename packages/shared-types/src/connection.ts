export type ConnectionMode =
  | 'localhost'
  | 'lan-direct'
  | 'frp-self-host'
  | 'wireguard'
  | 'ssh-reverse-tunnel'
  | 'custom';

export interface ConnectionInfo {
  id: string;
  provider: string;
  mode: ConnectionMode;
  endpoint?: string;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionEndpoint {
  url: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  qrText?: string;
}

export interface DiagnosticResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

export interface ConnectionCapability {
  available: boolean;
  requiresSetup: boolean;
  description: string;
}

export interface ConnectionProvider {
  id: string;
  name: string;
  detect(): Promise<ConnectionCapability>;
  start(config: Record<string, unknown>): Promise<ConnectionEndpoint>;
  stop(): Promise<void>;
  doctor(): Promise<DiagnosticResult[]>;
}
