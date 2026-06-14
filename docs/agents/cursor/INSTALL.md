# OpenBrige Integration for Cursor

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup cursor --server <YOUR_SERVER_URL>
```

Replace `<YOUR_SERVER_URL>` with your OpenBrige server URL (e.g. `http://192.168.1.100:7443`).

## What This Does

1. Creates `.openbrige/` config directory in your project
2. Adds OpenBrige MCP server to `.cursor/mcp.json`
3. Adds OpenBrige rules to `.cursor/rules/openbrige.mdc`

## Manual Setup

### MCP Server

Add this to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "openbrige": {
      "command": "npx",
      "args": ["-y", "@openbrige/cli", "mcp", "--server", "<YOUR_SERVER_URL>"]
    }
  }
}
```

### Agent Rules

Create `.cursor/rules/openbrige.mdc`:

```yaml
---
description: OpenBrige integration for Cursor Agent
globs:
alwaysApply: true
---
# OpenBrige Integration

This project uses OpenBrige for remote monitoring and control.
OpenBrige server: <YOUR_SERVER_URL>

You can use the OpenBrige MCP server to report progress and get instructions.

## Available MCP Tools
- `report_progress`: Report your current progress to OpenBrige
- `get_instructions`: Get OpenBrige instructions for this project
- `send_event`: Send a custom event to OpenBrige
```

## MCP Tools Available

After setup, you can use these tools:
- **report_progress** — Report your current progress to OpenBrige
- **get_instructions** — Get OpenBrige instructions for this project
- **send_event** — Send a custom event to OpenBrige

## Verify

Start OpenBrige and launch Cursor:
```bash
npx openbrige start cursor
```

Open `http://<YOUR_SERVER_URL>` in your browser to monitor the session.
