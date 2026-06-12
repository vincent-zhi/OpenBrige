import os from 'node:os';
import {
  type ConnectionCapability,
  type ConnectionEndpoint,
  type ConnectionProvider,
  type DiagnosticResult,
} from '@openbrige/shared-types';

export class LanDirectProvider implements ConnectionProvider {
  readonly id = 'lan-direct';
  readonly name = 'LAN Direct';

  async detect(): Promise<ConnectionCapability> {
    const ips = this.getLocalIPs();
    return {
      available: ips.length > 0,
      requiresSetup: false,
      description:
        ips.length > 0
          ? `LAN available via ${ips[0]}`
          : 'No LAN interface detected',
    };
  }

  async start(config: Record<string, unknown>): Promise<ConnectionEndpoint> {
    const port = typeof config.port === 'number' ? config.port : 3000;
    const ips = this.getLocalIPs();
    const host = ips[0] ?? '127.0.0.1';
    const protocol = config.tls ? 'https' : 'http';
    const url = `${protocol}://${host}:${port}`;
    const qrText = url;

    return { url, host, port, protocol, qrText };
  }

  async stop(): Promise<void> {
    // LAN direct has no persistent connection to tear down
  }

  async doctor(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    const ips = this.getLocalIPs();
    if (ips.length === 0) {
      results.push({
        name: 'local-ip',
        status: 'error',
        message: 'No non-internal IPv4 address found',
      });
    } else {
      results.push({
        name: 'local-ip',
        status: 'ok',
        message: `Local IP: ${ips.join(', ')}`,
      });
    }

    return results;
  }

  getLocalIPs(): string[] {
    const interfaces = os.networkInterfaces();
    const results: string[] = [];

    for (const name of Object.keys(interfaces)) {
      const addrs = interfaces[name];
      if (!addrs) continue;
      for (const addr of addrs) {
        if (!addr.internal && addr.family === 'IPv4') {
          results.push(addr.address);
        }
      }
    }

    return results;
  }
}
