import type {
  ConnectionProvider,
  ConnectionCapability,
  ConnectionEndpoint,
  DiagnosticResult,
} from '@openbrige/shared-types';

/** FRP (Fast Reverse Proxy) connection provider */
export class FrpConnectionProvider implements ConnectionProvider {
  readonly id = 'frp';
  readonly name = 'FRP';

  async detect(): Promise<ConnectionCapability> {
    return { available: true, requiresSetup: true, description: 'FRP self-hosted reverse proxy tunnel' };
  }

  async start(config: Record<string, unknown>): Promise<ConnectionEndpoint> {
    const host = (config.serverHost as string) ?? '127.0.0.1';
    const port = (config.remotePort as number) ?? 8080;
    return {
      url: `http://${host}:${port}`,
      host,
      port,
      protocol: 'http',
    };
  }

  async stop(): Promise<void> {
    // stub: no-op
  }

  async doctor(): Promise<DiagnosticResult[]> {
    return [
      { name: 'FRP Binary', status: 'warning', message: 'FRP binary check not implemented', details: 'Requires frpc installed and configured' },
    ];
  }
}

/** WireGuard VPN connection provider */
export class WireGuardConnectionProvider implements ConnectionProvider {
  readonly id = 'wireguard';
  readonly name = 'WireGuard';

  async detect(): Promise<ConnectionCapability> {
    return { available: true, requiresSetup: true, description: 'WireGuard VPN tunnel' };
  }

  async start(config: Record<string, unknown>): Promise<ConnectionEndpoint> {
    const host = (config.endpointHost as string) ?? '10.0.0.1';
    const port = (config.listenPort as number) ?? 51820;
    return {
      url: `http://${host}:${port}`,
      host,
      port,
      protocol: 'http',
    };
  }

  async stop(): Promise<void> {
    // stub: no-op
  }

  async doctor(): Promise<DiagnosticResult[]> {
    return [
      { name: 'WireGuard Binary', status: 'warning', message: 'WireGuard binary check not implemented', details: 'Requires wg installed and configured' },
    ];
  }
}

/** SSH reverse tunnel connection provider */
export class SshReverseTunnelProvider implements ConnectionProvider {
  readonly id = 'ssh-reverse-tunnel';
  readonly name = 'SSH Reverse Tunnel';

  async detect(): Promise<ConnectionCapability> {
    return { available: true, requiresSetup: true, description: 'SSH reverse tunnel for remote access' };
  }

  async start(config: Record<string, unknown>): Promise<ConnectionEndpoint> {
    const host = (config.remoteHost as string) ?? 'localhost';
    const port = (config.remotePort as number) ?? 8080;
    return {
      url: `http://${host}:${port}`,
      host,
      port,
      protocol: 'http',
    };
  }

  async stop(): Promise<void> {
    // stub: no-op
  }

  async doctor(): Promise<DiagnosticResult[]> {
    return [
      { name: 'SSH Binary', status: 'warning', message: 'SSH binary check not implemented', details: 'Requires ssh client installed and configured' },
    ];
  }
}

/** Cloudflare Tunnel connection provider */
export class CloudflareTunnelProvider implements ConnectionProvider {
  readonly id = 'cloudflare-tunnel';
  readonly name = 'Cloudflare Tunnel';

  async detect(): Promise<ConnectionCapability> {
    return { available: true, requiresSetup: true, description: 'Cloudflare Tunnel (cloudflared) for secure exposure' };
  }

  async start(config: Record<string, unknown>): Promise<ConnectionEndpoint> {
    const host = (config.hostname as string) ?? 'localhost';
    const port = (config.localPort as number) ?? 8080;
    return {
      url: `https://${host}`,
      host,
      port,
      protocol: 'https',
    };
  }

  async stop(): Promise<void> {
    // stub: no-op
  }

  async doctor(): Promise<DiagnosticResult[]> {
    return [
      { name: 'cloudflared Binary', status: 'warning', message: 'cloudflared binary check not implemented', details: 'Requires cloudflared installed and configured' },
    ];
  }
}

/** ngrok connection provider */
export class NgrokConnectionProvider implements ConnectionProvider {
  readonly id = 'ngrok';
  readonly name = 'ngrok';

  async detect(): Promise<ConnectionCapability> {
    return { available: true, requiresSetup: true, description: 'ngrok tunnel for quick public URL' };
  }

  async start(config: Record<string, unknown>): Promise<ConnectionEndpoint> {
    const host = (config.region as string) ?? 'connect.ngrok.io';
    const port = (config.localPort as number) ?? 8080;
    return {
      url: `https://${host}`,
      host,
      port,
      protocol: 'https',
    };
  }

  async stop(): Promise<void> {
    // stub: no-op
  }

  async doctor(): Promise<DiagnosticResult[]> {
    return [
      { name: 'ngrok Binary', status: 'warning', message: 'ngrok binary check not implemented', details: 'Requires ngrok installed and configured' },
    ];
  }
}

/** Headscale (WireGuard management plane) connection provider */
export class HeadscaleConnectionProvider implements ConnectionProvider {
  readonly id = 'headscale';
  readonly name = 'Headscale';

  async detect(): Promise<ConnectionCapability> {
    return { available: true, requiresSetup: true, description: 'Headscale-managed WireGuard VPN' };
  }

  async start(config: Record<string, unknown>): Promise<ConnectionEndpoint> {
    const host = (config.tailnetIP as string) ?? '100.64.0.1';
    const port = (config.listenPort as number) ?? 7443;
    return {
      url: `https://${host}:${port}`,
      host,
      port,
      protocol: 'https',
    };
  }

  async stop(): Promise<void> {
    // stub: no-op
  }

  async doctor(): Promise<DiagnosticResult[]> {
    return [
      { name: 'Headscale CLI', status: 'warning', message: 'Headscale CLI check not implemented', details: 'Requires headscale CLI installed and authenticated' },
    ];
  }
}
