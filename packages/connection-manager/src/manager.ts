import {
  type ConnectionInfo,
  type ConnectionProvider,
  type DiagnosticResult,
} from '@openbrige/shared-types';
import type { LanDirectProvider } from './lan.js';

export class ConnectionManager {
  private providers = new Map<string, ConnectionProvider>();
  private current: ConnectionInfo | null = null;

  registerProvider(provider: ConnectionProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProviders(): ConnectionProvider[] {
    return Array.from(this.providers.values());
  }

  getProvider(id: string): ConnectionProvider | undefined {
    return this.providers.get(id);
  }

  getCurrentConnection(): ConnectionInfo | null {
    return this.current;
  }

  async doctor(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    for (const provider of this.providers.values()) {
      const providerResults = await provider.doctor();
      results.push(...providerResults);
    }
    return results;
  }

  async getConnectInfo(port: number): Promise<ConnectionInfo> {
    const provider = this.providers.get('lan-direct') as
      | LanDirectProvider
      | undefined;

    if (!provider) {
      throw new Error('lan-direct provider not registered');
    }

    const ips = provider.getLocalIPs();
    const endpoint = ips.length > 0 ? `http://${ips[0]}:${port}` : undefined;

    const now = new Date().toISOString();
    const info: ConnectionInfo = {
      id: crypto.randomUUID(),
      provider: provider.id,
      mode: 'lan-direct',
      endpoint,
      status: endpoint ? 'connected' : 'disconnected',
      createdAt: now,
      updatedAt: now,
    };

    this.current = info;
    return info;
  }
}
