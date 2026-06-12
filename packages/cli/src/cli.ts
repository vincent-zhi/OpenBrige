#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { startServer } from '@openbrige/host';
import { NetworkDoctor } from '@openbrige/network-doctor';
import { LanDirectProvider } from '@openbrige/connection-manager';
import { printBanner, printDiagnostics } from './banner.js';
import type { BridgeSession, AgentProfile } from '@openbrige/shared-types';

const DEFAULT_PORT = 7443;
const DEFAULT_HOST = 'localhost';

function baseUrl(port: number, host: string): string {
  const h = host === '0.0.0.0' ? 'localhost' : host;
  return `http://${h}:${port}`;
}

async function apiFetch<T>(path: string, port: number, host: string): Promise<T> {
  const url = `${baseUrl(port, host)}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

const program = new Command();

program
  .name('openbrige')
  .description('OpenBrige - Bridge your coding agents to any device')
  .version('0.1.0');

// ── start ────────────────────────────────────────────────────

program
  .command('start')
  .description('Start the OpenBrige host server')
  .argument('[profile]', 'Profile ID to launch a session with')
  .option('-p, --port <port>', 'Port to listen on', String(DEFAULT_PORT))
  .option('-H, --host <host>', 'Host to bind to', DEFAULT_HOST)
  .option('-s, --sandbox', 'Run in sandbox mode')
  .action(async (profile: string | undefined, opts: { port: string; host: string; sandbox?: boolean }) => {
    const port = parseInt(opts.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('Error: invalid port number');
      process.exit(1);
    }

    let shutdownFn: (() => Promise<void>) | undefined;

    const serverReady = new Promise<void>((resolve) => {
      const { shutdown } = startServer({
        port,
        host: opts.host,
        onReady: () => {
          printBanner({ port, host: opts.host, profileName: profile });
          resolve();
        },
      });
      shutdownFn = shutdown;
    });

    await serverReady;

    if (profile) {
      try {
        const data = await apiFetch<{ profiles: AgentProfile[] }>(
          '/api/profiles',
          port,
          opts.host,
        );
        const match = data.profiles.find(
          (p) => p.id === profile || p.name === profile,
        );

        if (match) {
          await fetch(`${baseUrl(port, opts.host)}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: match.command,
              args: match.args,
              cwd: match.cwd,
              profileId: match.id,
              title: match.name,
            }),
          });
          console.log(`  Session started with profile: ${match.name}`);
          console.log();
        } else {
          console.log(`  Warning: profile "${profile}" not found`);
          console.log();
        }
      } catch {
        console.log('  Warning: could not auto-start profile session');
        console.log();
      }
    }

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down...`);
      if (shutdownFn) await shutdownFn();
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  });

// ── session ──────────────────────────────────────────────────

const sessionCmd = program
  .command('session')
  .description('Manage sessions');

sessionCmd
  .command('list')
  .description('List all active sessions')
  .option('-p, --port <port>', 'Server port', String(DEFAULT_PORT))
  .option('-H, --host <host>', 'Server host', DEFAULT_HOST)
  .action(async (opts: { port: string; host: string }) => {
    const port = parseInt(opts.port, 10);
    try {
      const data = await apiFetch<{ sessions: BridgeSession[] }>(
        '/api/sessions',
        port,
        opts.host,
      );

      if (data.sessions.length === 0) {
        console.log('  No active sessions.');
        return;
      }

      console.log();
      console.log(`  ${'ID'.padEnd(22)} ${'Status'.padEnd(16)} ${'Title'}`);
      console.log(`  ${'\u2500'.repeat(22)} ${'\u2500'.repeat(16)} ${'\u2500'.repeat(30)}`);

      for (const s of data.sessions) {
        const id = s.id.length > 20 ? s.id.slice(0, 20) + '..' : s.id.padEnd(20);
        console.log(`  ${id}  ${s.status.padEnd(16)} ${s.title}`);
      }
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  Error: could not connect to server (${message})`);
      console.error('  Is the server running? Start it with: openbrige start');
      process.exit(1);
    }
  });

sessionCmd
  .command('open')
  .description('Print session URL to open in browser')
  .argument('<id>', 'Session ID')
  .option('-p, --port <port>', 'Server port', String(DEFAULT_PORT))
  .option('-H, --host <host>', 'Server host', DEFAULT_HOST)
  .action((id: string, opts: { port: string; host: string }) => {
    const port = parseInt(opts.port, 10);
    const h = opts.host === '0.0.0.0' ? 'localhost' : opts.host;
    const url = `http://${h}:${port}/session/${id}`;
    console.log(`  Open in browser: ${url}`);
  });

// ── profiles ─────────────────────────────────────────────────

const profilesCmd = program
  .command('profiles')
  .description('Manage agent profiles');

profilesCmd
  .command('list')
  .description('List available profiles')
  .option('-p, --port <port>', 'Server port', String(DEFAULT_PORT))
  .option('-H, --host <host>', 'Server host', DEFAULT_HOST)
  .action(async (opts: { port: string; host: string }) => {
    const port = parseInt(opts.port, 10);
    try {
      const data = await apiFetch<{ profiles: AgentProfile[] }>(
        '/api/profiles',
        port,
        opts.host,
      );

      if (data.profiles.length === 0) {
        console.log('  No profiles found.');
        console.log('  Add profiles to .openbrige/profiles/');
        return;
      }

      console.log();
      console.log(`  ${'ID'.padEnd(22)} ${'Name'.padEnd(22)} ${'Command'}`);
      console.log(`  ${'\u2500'.repeat(22)} ${'\u2500'.repeat(22)} ${'\u2500'.repeat(30)}`);

      for (const p of data.profiles) {
        const id = p.id.length > 20 ? p.id.slice(0, 20) + '..' : p.id.padEnd(20);
        const name = p.name.length > 20 ? p.name.slice(0, 20) + '..' : p.name.padEnd(20);
        console.log(`  ${id}  ${name}  ${p.command} ${p.args.join(' ')}`);
      }
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  Error: could not connect to server (${message})`);
      console.error('  Is the server running? Start it with: openbrige start');
      process.exit(1);
    }
  });

// ── doctor ───────────────────────────────────────────────────

const doctorCmd = program
  .command('doctor')
  .description('Run diagnostics');

doctorCmd
  .command('connect')
  .description('Run connection diagnostics')
  .option('-p, --port <port>', 'Server port', String(DEFAULT_PORT))
  .option('-H, --host <host>', 'Server host', DEFAULT_HOST)
  .action(async (opts: { port: string; host: string }) => {
    const port = parseInt(opts.port, 10);
    const doctor = new NetworkDoctor();

    console.log('  Running connection diagnostics...');
    const results = await doctor.runDiagnostics(
      opts.host === '0.0.0.0' ? 'localhost' : opts.host,
      port,
    );

    const provider = new LanDirectProvider();
    const providerResults = await provider.doctor();
    results.push(...providerResults);

    printDiagnostics(results);
  });

// ── plugin ───────────────────────────────────────────────────

const pluginCmd = program
  .command('plugin')
  .description('Manage plugins');

pluginCmd
  .command('list')
  .description('List installed plugins')
  .option('-p, --port <port>', 'Server port', String(DEFAULT_PORT))
  .option('-H, --host <host>', 'Server host', DEFAULT_HOST)
  .action(async (opts: { port: string; host: string }) => {
    const port = parseInt(opts.port, 10);
    try {
      const data = await apiFetch<{ profiles: AgentProfile[] }>(
        '/api/profiles',
        port,
        opts.host,
      );

      if (data.profiles.length === 0) {
        console.log('  No profiles found.');
        console.log('  Add profiles to .openbrige/profiles/');
        return;
      }

      console.log();
      console.log(`  ${'ID'.padEnd(22)} ${'Name'.padEnd(22)} ${'Command'}`);
      console.log(`  ${'\u2500'.repeat(22)} ${'\u2500'.repeat(22)} ${'\u2500'.repeat(30)}`);

      for (const p of data.profiles) {
        const id = p.id.length > 20 ? p.id.slice(0, 20) + '..' : p.id.padEnd(20);
        const name = p.name.length > 20 ? p.name.slice(0, 20) + '..' : p.name.padEnd(20);
        console.log(`  ${id}  ${name}  ${p.command} ${p.args.join(' ')}`);
      }
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  Error: could not connect to server (${message})`);
      console.error('  Is the server running? Start it with: openbrige start');
      process.exit(1);
    }
  });

pluginCmd
  .command('install')
  .description('Install a plugin from a local path')
  .argument('<path>', 'Path to plugin directory')
  .action((pluginPath: string) => {
    const targetDir = path.join(process.cwd(), '.openbrige', 'plugins');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const resolved = path.resolve(pluginPath);
    if (!fs.existsSync(resolved)) {
      console.error(`  Error: path does not exist: ${resolved}`);
      process.exit(1);
    }

    const pluginName = path.basename(resolved);
    const dest = path.join(targetDir, pluginName);

    if (fs.existsSync(dest)) {
      console.log(`  Plugin "${pluginName}" already installed.`);
      return;
    }

    // Create a symlink
    fs.symlinkSync(resolved, dest, 'junction');
    console.log(`  Plugin installed: ${pluginName}`);
    console.log(`  Restart the server to load the plugin.`);
  });

// ── tunnel ──────────────────────────────────────────────────

const tunnelCmd = program
  .command('tunnel')
  .description('Manage connection tunnels');

tunnelCmd
  .command('frp')
  .description('FRP tunnel management')
  .addCommand(
    new Command('init')
      .description('Initialize FRP configuration')
      .action(() => {
        const configDir = path.join(process.cwd(), '.openbrige');
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        const frpConfig = {
          serverAddr: 'your-frp-server.com',
          serverPort: 7000,
          token: 'your-token',
          localPort: DEFAULT_PORT,
          remotePort: DEFAULT_PORT,
        };

        fs.writeFileSync(
          path.join(configDir, 'frpc.json'),
          JSON.stringify(frpConfig, null, 2) + '\n',
        );

        console.log('  FRP configuration created at .openbrige/frpc.json');
        console.log('  Edit the file with your FRP server details.');
      }),
  );

tunnelCmd
  .command('wireguard')
  .description('WireGuard tunnel management')
  .addCommand(
    new Command('doctor')
      .description('Check WireGuard connectivity')
      .action(() => {
        console.log('  Checking WireGuard connectivity...');
        console.log();
        console.log('  WireGuard requires manual setup:');
        console.log('  1. Install WireGuard on both devices');
        console.log('  2. Configure a shared private network');
        console.log('  3. Add the server IP to your OpenBrige config');
        console.log();
        console.log('  See docs: https://openbrige.dev/docs/connection#wireguard');
      }),
  );

// ── init ─────────────────────────────────────────────────────

program
  .command('init')
  .description('Initialize OpenBrige in the current directory')
  .action(() => {
    const dir = path.join(process.cwd(), '.openbrige');

    if (fs.existsSync(dir)) {
      console.log('  .openbrige directory already exists.');
      return;
    }

    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(path.join(dir, 'plugins'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'profiles'), { recursive: true });

    const config = {
      version: '0.1.0',
      port: DEFAULT_PORT,
      host: DEFAULT_HOST,
      sandbox: false,
    };
    fs.writeFileSync(
      path.join(dir, 'config.json'),
      JSON.stringify(config, null, 2) + '\n',
    );

    const gitignore = 'data.db\nplugins/\n';
    fs.writeFileSync(path.join(dir, '.gitignore'), gitignore);

    console.log('  Initialized .openbrige directory:');
    console.log('    .openbrige/config.json');
    console.log('    .openbrige/profiles/');
    console.log('    .openbrige/plugins/');
    console.log();
    console.log('  Start the server with: openbrige start');
  });

program.parse();
