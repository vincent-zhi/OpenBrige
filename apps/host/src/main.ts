import { networkInterfaces } from 'node:os';
import { startServer } from './server.js';
import { printQRCode } from '@openbrige/network-doctor';

function getLANIP(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip internal and non-IPv4
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

const PORT = parseInt(process.env.PORT ?? '7443', 10);
const HOST = process.env.HOST ?? 'localhost';
const TLS = process.env.TLS === 'true';
const TLS_CERT = process.env.TLS_CERT;
const TLS_KEY = process.env.TLS_KEY;

const { shutdown } = await startServer({
  port: PORT,
  host: HOST,
  dbPath: process.env.DB_PATH,
  workspaceDir: process.env.WORKSPACE_DIR,
  pluginDirs: process.env.PLUGIN_DIRS?.split(','),
  profileDirs: process.env.PROFILE_DIRS?.split(','),
  tls: TLS,
  tlsCert: TLS_CERT,
  tlsKey: TLS_KEY,
  onReady: ({ port, host, protocol }) => {
    const proto = protocol ?? (TLS ? 'https' : 'http');
    const wsProto = proto === 'https' ? 'wss' : 'ws';
    console.log('');
    console.log('  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510');
    console.log('  \u2502                                         \u2502');
    console.log('  \u2502   \u25C6 OpenBrige Host Server               \u2502');
    console.log('  \u2502                                         \u2502');
    console.log(`  \u2502   ${proto.toUpperCase().padEnd(6)} \u2192 ${proto}://${host}:${port}          \u2502`);
    console.log(`  \u2502   WS    \u2192 ${wsProto}://${host}:${port}/ws        \u2502`);
    console.log('  \u2502                                         \u2502');
    console.log('  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518');
    console.log('');

    const lanIP = getLANIP();
    if (lanIP) {
      const lanUrl = `${proto}://${lanIP}:${port}`;
      console.log(`  Open on your phone: ${lanUrl}`);
      printQRCode(lanUrl);
    }
  },
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down...`);
  await shutdown();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
