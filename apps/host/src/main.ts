import { startServer } from './server.js';

const PORT = parseInt(process.env.PORT ?? '7443', 10);
const HOST = process.env.HOST ?? 'localhost';

const { shutdown } = startServer({
  port: PORT,
  host: HOST,
  dbPath: process.env.DB_PATH,
  workspaceDir: process.env.WORKSPACE_DIR,
  pluginDirs: process.env.PLUGIN_DIRS?.split(','),
  profileDirs: process.env.PROFILE_DIRS?.split(','),
  onReady: ({ port, host }) => {
    console.log('');
    console.log('  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510');
    console.log('  \u2502                                         \u2502');
    console.log('  \u2502   \u25C6 OpenBrige Host Server               \u2502');
    console.log('  \u2502                                         \u2502');
    console.log(`  \u2502   HTTP  \u2192 http://${host}:${port}          \u2502`);
    console.log(`  \u2502   WS    \u2192 ws://${host}:${port}/ws        \u2502`);
    console.log('  \u2502                                         \u2502');
    console.log('  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518');
    console.log('');
  },
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down...`);
  await shutdown();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
