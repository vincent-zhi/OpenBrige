import { StringDecoder } from 'node:string_decoder';

// ── JSON-RPC types ──────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ── MCP tool definitions ────────────────────────────────────

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const tools: ToolDefinition[] = [
  {
    name: 'report_progress',
    description: 'Report agent progress to OpenBrige',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID (optional)' },
        message: { type: 'string', description: 'Progress message' },
        status: { type: 'string', description: 'Status (e.g. "running", "completed", "error")' },
      },
      required: ['message'],
    },
  },
  {
    name: 'get_instructions',
    description: 'Get OpenBrige instructions for the current project',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'send_event',
    description: 'Send a custom event to OpenBrige',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Event type' },
        sessionId: { type: 'string', description: 'Session ID (optional)' },
        data: { type: 'object', description: 'Event data payload (optional)' },
      },
      required: ['type'],
    },
  },
];

// ── Server info ─────────────────────────────────────────────

const SERVER_INFO = {
  name: 'openbrige-mcp',
  version: '0.1.0',
};

const SERVER_CAPABILITIES = {
  tools: {},
};

// ── Tool execution ──────────────────────────────────────────

async function callTool(
  name: string,
  args: Record<string, unknown>,
  serverUrl: string,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  switch (name) {
    case 'report_progress': {
      const { sessionId, message, status } = args;
      const body: Record<string, unknown> = { message };
      if (sessionId) body.sessionId = sessionId;
      if (status) body.status = status;

      try {
        const res = await fetch(`${serverUrl}/api/mcp/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const text = await res.text();
          return { content: [{ type: 'text', text: `Error: ${res.status} - ${text}` }] };
        }
        return { content: [{ type: 'text', text: 'Progress reported successfully' }] };
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: `Error connecting to OpenBrige server: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }

    case 'get_instructions': {
      try {
        const res = await fetch(`${serverUrl}/api/config`);
        if (!res.ok) {
          const text = await res.text();
          return { content: [{ type: 'text', text: `Error: ${res.status} - ${text}` }] };
        }
        const config = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(config, null, 2) }] };
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: `Error connecting to OpenBrige server: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }

    case 'send_event': {
      const { type: eventType, sessionId, data } = args;
      const body: Record<string, unknown> = { type: eventType };
      if (sessionId) body.sessionId = sessionId;
      if (data) body.data = data;

      try {
        const res = await fetch(`${serverUrl}/api/mcp/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const text = await res.text();
          return { content: [{ type: 'text', text: `Error: ${res.status} - ${text}` }] };
        }
        return { content: [{ type: 'text', text: 'Event sent successfully' }] };
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: `Error connecting to OpenBrige server: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      };
  }
}

// ── Request handling ────────────────────────────────────────

function handleRequest(request: JsonRpcRequest, serverUrl: string): Promise<JsonRpcResponse> | JsonRpcResponse {
  const id = request.id ?? null;

  if (request.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: SERVER_CAPABILITIES,
        serverInfo: SERVER_INFO,
      },
    };
  }

  if (request.method === 'notifications/initialized') {
    // Client notification — no response needed per MCP spec
    return {
      jsonrpc: '2.0',
      id,
      result: {},
    };
  }

  if (request.method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools },
    };
  }

  if (request.method === 'tools/call') {
    const toolName = request.params?.['name'] as string | undefined;
    const arguments_ = (request.params?.['arguments'] as Record<string, unknown>) ?? {};

    if (!toolName) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: 'Missing tool name in params' },
      };
    }

    return callTool(toolName, arguments_, serverUrl).then((result) => ({
      jsonrpc: '2.0',
      id,
      result,
    }));
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${request.method}` },
  };
}

// ── Main server loop ────────────────────────────────────────

export function startMcpServer(serverUrl: string): void {
  const decoder = new StringDecoder('utf-8');
  let buffer = '';

  process.stdin.on('data', (chunk: Buffer) => {
    buffer += decoder.write(chunk);
    const lines = buffer.split('\n');
    // Keep the last (potentially incomplete) line in the buffer
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      handleMessage(trimmed, serverUrl);
    }
  });

  process.stdin.on('end', () => {
    const remaining = buffer.trim();
    if (remaining) {
      handleMessage(remaining, serverUrl);
    }
    process.exit(0);
  });
}

async function handleMessage(line: string, serverUrl: string): Promise<void> {
  let request: JsonRpcRequest;
  try {
    request = JSON.parse(line);
  } catch {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    };
    process.stdout.write(JSON.stringify(response) + '\n');
    return;
  }

  const response = await handleRequest(request, serverUrl);

  // Notifications without an id don't need a response
  if (request.id === undefined && request.method === 'notifications/initialized') {
    return;
  }

  process.stdout.write(JSON.stringify(response) + '\n');
}
