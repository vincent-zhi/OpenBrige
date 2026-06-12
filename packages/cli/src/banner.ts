import os from 'node:os';
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

export interface DiagnosticResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

export function printBanner(options: {
  port: number;
  host: string;
  lanIP?: string;
  profiles?: string[];
  sandboxEnabled?: boolean;
  diagnostics?: DiagnosticResult[];
}): void {
  const { port, host, lanIP, profiles, sandboxEnabled, diagnostics } = options;

  const localIPs = getLocalIPs();
  const detectedLanIP = lanIP ?? localIPs[0];

  console.log();
  console.log('OpenBrige');
  console.log('\u2500'.repeat(24));

  // Status lines with ✓ / ✗
  console.log('\u2713 Host Server started');
  console.log('\u2713 Web UI available');
  console.log(detectedLanIP ? '\u2713 Local network detected' : '\u2717 Local network not detected');

  if (profiles && profiles.length > 0) {
    console.log(`\u2713 Profiles loaded: ${profiles.join(', ')}`);
  } else {
    console.log('\u2717 No profiles loaded');
  }

  if (sandboxEnabled) {
    console.log('\u2713 Worktree sandbox enabled');
  } else {
    console.log('\u2717 Worktree sandbox disabled');
  }

  // Diagnostics
  if (diagnostics && diagnostics.length > 0) {
    for (const d of diagnostics) {
      const icon = d.status === 'ok' ? '\u2713' : d.status === 'warning' ? '\u26A0' : '\u2717';
      console.log(`${icon} ${d.name}: ${d.message}`);
    }
  }

  console.log();
  console.log('Open on this computer:');
  console.log(`  http://localhost:${port}`);

  if (detectedLanIP) {
    console.log();
    console.log('Open on your phone:');
    console.log(`  https://${detectedLanIP}:${port}`);
    console.log();
    console.log('Scan QR:');
    const qr = generateQRCodeASCII(`https://${detectedLanIP}:${port}`);
    for (const line of qr.split('\n')) {
      console.log(`  ${line}`);
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
