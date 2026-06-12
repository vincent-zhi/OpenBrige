import os from 'node:os';
import type { DiagnosticResult } from '@openbrige/shared-types';
import { generateQRCodeASCII } from '@openbrige/network-doctor';

function getLocalIPs(): string[] {
  const ifaces = os.networkInterfaces();
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

function statusIcon(status: 'ok' | 'warning' | 'error'): string {
  switch (status) {
    case 'ok': return '\u2713';
    case 'warning': return '\u26A0';
    case 'error': return '\u2717';
  }
}

export interface BannerOptions {
  port: number;
  host: string;
  profileName?: string;
  diagnostics?: DiagnosticResult[];
}

export function printBanner(options: BannerOptions): void {
  const { port, host, profileName, diagnostics } = options;
  const localIPs = getLocalIPs();
  const lanIP = localIPs[0];

  console.log();
  console.log('  OpenBrige');
  console.log('  \u2500'.repeat(24));
  console.log(`  \u2713 Host Server started on ${host}:${port}`);
  console.log('  \u2713 Web UI available');

  if (profileName) {
    console.log(`  \u2713 Profile: ${profileName}`);
  }

  console.log();
  console.log(`  Open on this computer: http://localhost:${port}`);

  if (lanIP) {
    console.log(`  Open on your phone:    http://${lanIP}:${port}`);
    console.log();
    console.log('  Scan QR code to connect from mobile:');
    console.log();
    const qr = generateQRCodeASCII(`http://${lanIP}:${port}`);
    for (const line of qr.split('\n')) {
      console.log(`    ${line}`);
    }
  }

  if (diagnostics && diagnostics.length > 0) {
    console.log();
    for (const d of diagnostics) {
      const icon = statusIcon(d.status);
      console.log(`  ${icon} ${d.name}: ${d.message}`);
    }
  }

  console.log();
}

export function printDiagnostics(results: DiagnosticResult[]): void {
  console.log();
  console.log('  Connection Diagnostics');
  console.log('  \u2500'.repeat(24));

  for (const r of results) {
    const icon = statusIcon(r.status);
    console.log(`  ${icon} ${r.name}: ${r.message}`);
    if (r.details) {
      for (const line of r.details.split('\n')) {
        console.log(`    ${line}`);
      }
    }
  }

  const hasErrors = results.some((r) => r.status === 'error');
  const hasWarnings = results.some((r) => r.status === 'warning');

  console.log();
  if (hasErrors) {
    console.log('  Some checks failed. Please fix the errors above.');
  } else if (hasWarnings) {
    console.log('  Checks passed with warnings.');
  } else {
    console.log('  All checks passed!');
  }
  console.log();
}
