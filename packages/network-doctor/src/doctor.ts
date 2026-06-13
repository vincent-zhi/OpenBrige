import { networkInterfaces, hostname } from 'node:os';
import { createConnection } from 'node:net';
import { connect as tlsConnect } from 'node:tls';
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

    // mDNS name detection
    let mdnsName = '';
    try {
      const hostnameVal = hostname();
      mdnsName = `${hostnameVal.toLowerCase().replace(/[^a-z0-9]/g, '-')}.local`;
    } catch {
      mdnsName = '';
    }

    results.push(this.checkPlatform());

    const ipResults = this.checkLocalIP();
    results.push(ipResults);

    results.push({
      name: 'mDNS Name',
      status: mdnsName ? 'ok' : 'warning',
      message: mdnsName ? `✓ ${mdnsName}` : 'mDNS name not available',
      details: mdnsName ? `Accessible as ${mdnsName} on local network` : undefined,
    });

    const portResult = await this.checkPortAvailability(host, port, timeoutMs);
    results.push(portResult);

    results.push(this.checkFirewallHints());

    const certResult = await this.checkCertificate(host, port);
    results.push(certResult);

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

  async checkCertificate(host: string, port: number): Promise<DiagnosticResult> {
    const result: DiagnosticResult = {
      name: 'https-certificate',
      status: 'warning',
      message: '',
      details: '',
    };

    try {
      const cert = await new Promise<Record<string, unknown> | null>((resolve) => {
        const socket = tlsConnect(
          { host, port, rejectUnauthorized: false, servername: host },
          () => {
            const c = socket.getPeerCertificate();
            socket.destroy();
            resolve(c && Object.keys(c).length > 0 ? (c as unknown as Record<string, unknown>) : null);
          },
        );
        socket.on('error', () => {
          socket.destroy();
          resolve(null);
        });
        socket.setTimeout(3000, () => {
          socket.destroy();
          resolve(null);
        });
      });

      if (!cert) {
        result.status = 'warning';
        result.message = 'No certificate found — HTTPS not enabled or not reachable';
        return result;
      }

      const validTo = new Date(cert.valid_to as string);
      const now = new Date();
      const subject = (cert.subject as Record<string, string>)?.CN || 'Unknown';
      const issuer = (cert.issuer as Record<string, string>)?.CN || 'Unknown';
      const validFrom = cert.valid_from as string;
      const validToStr = cert.valid_to as string;
      const fingerprint = cert.fingerprint as string;

      if (validTo < now) {
        result.status = 'error';
        result.message = `Certificate expired on ${validToStr}`;
      } else if (issuer === subject) {
        result.status = 'warning';
        result.message = 'Self-signed certificate detected';
      } else {
        result.status = 'ok';
        result.message = `Valid until ${validToStr}`;
      }

      result.details = [
        `Subject: ${subject}`,
        `Issuer: ${issuer}`,
        `Valid from: ${validFrom}`,
        `Valid to: ${validToStr}`,
        `Fingerprint: ${fingerprint}`,
      ].join('\n');
    } catch {
      result.status = 'warning';
      result.message = 'HTTPS not enabled or not reachable';
    }

    return result;
  }
}
