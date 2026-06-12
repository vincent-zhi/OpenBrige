import { networkInterfaces } from 'node:os';
import { createConnection } from 'node:net';
import { platform, release, arch } from 'node:os';
import type { DiagnosticResult } from '@openbrige/shared-types';

function collectLocalIPs(): string[] {
  const ifaces = networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(ifaces)) {
    const entries = ifaces[name] ?? [];
    for (const entry of entries) {
      if (!entry.internal && entry.family === 'IPv4') {
        ips.push(entry.address);
      }
    }
  }
  return ips;
}

function checkPort(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function getFirewallHints(): string[] {
  const hints: string[] = [];
  const p = platform();

  if (p === 'win32') {
    hints.push(
      'Check Windows Defender Firewall: allow inbound on your target port',
      'Run: netsh advfirewall firewall add rule name="openbrige" dir=in action=allow protocol=tcp localport=<PORT>',
    );
  } else if (p === 'darwin') {
    hints.push(
      'Check macOS firewall in System Settings > Network > Firewall',
      'If using pfctl, ensure your port is allowed in /etc/pf.conf',
    );
  } else {
    hints.push(
      'Check iptables/nftables: sudo iptables -L -n | grep <PORT>',
      'For ufw: sudo ufw allow <PORT>/tcp',
    );
  }
  return hints;
}

export interface RunOptions {
  timeoutMs?: number;
}

export class NetworkDoctor {
  async runDiagnostics(host: string, port: number, options?: RunOptions): Promise<DiagnosticResult[]> {
    const timeoutMs = options?.timeoutMs ?? 2000;
    const results: DiagnosticResult[] = [];

    results.push(this.checkPlatform());

    const ipResults = this.checkLocalIP();
    results.push(ipResults);

    const portResult = await this.checkPortAvailability(host, port, timeoutMs);
    results.push(portResult);

    results.push(this.checkFirewallHints());

    return results;
  }

  private checkPlatform(): DiagnosticResult {
    return {
      name: 'platform',
      status: 'ok',
      message: `${platform()} ${release()} ${arch()}`,
      details: `Node ${process.version}`,
    };
  }

  private checkLocalIP(): DiagnosticResult {
    const ips = collectLocalIPs();
    if (ips.length === 0) {
      return {
        name: 'local-ip',
        status: 'warning',
        message: 'No non-internal IPv4 addresses found',
        details: 'You may be disconnected from the network',
      };
    }
    return {
      name: 'local-ip',
      status: 'ok',
      message: ips.join(', '),
    };
  }

  private async checkPortAvailability(host: string, port: number, timeoutMs: number): Promise<DiagnosticResult> {
    const reachable = await checkPort(host, port, timeoutMs);
    if (reachable) {
      return {
        name: 'port-availability',
        status: 'ok',
        message: `Port ${port} on ${host} is accepting connections`,
      };
    }
    return {
      name: 'port-availability',
      status: 'error',
      message: `Port ${port} on ${host} is not reachable`,
      details: 'Ensure the server is running and listening on the correct interface',
    };
  }

  private checkFirewallHints(): DiagnosticResult {
    const hints = getFirewallHints();
    return {
      name: 'firewall-hints',
      status: 'warning',
      message: `${hints.length} platform-specific tip(s) available`,
      details: hints.join('\n'),
    };
  }
}
