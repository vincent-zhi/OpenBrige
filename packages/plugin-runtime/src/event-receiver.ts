import { createServer, type Server } from 'node:http';

export interface EventReceiverOptions {
  port: number;
  host?: string;
  onEvent: (sessionId: string, payload: { pluginId: string; eventType: string; data: Record<string, unknown> }) => void;
}

export class PluginEventReceiver {
  private server: Server | null = null;

  start(options: EventReceiverOptions): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => {
        if (req.method === 'POST' && req.url === '/events') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (parsed.session_id && parsed.type) {
                options.onEvent(parsed.session_id, {
                  pluginId: parsed.plugin_id ?? 'unknown',
                  eventType: parsed.type,
                  data: parsed.data ?? {},
                });
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
        } else {
          res.writeHead(404);
          res.end();
        }
      });
      this.server.listen(options.port, options.host ?? '127.0.0.1', () => resolve());
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
