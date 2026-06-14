# OpenBrige Integration for Goose

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup goose --server <YOUR_SERVER_URL>
```

Replace `<YOUR_SERVER_URL>` with your OpenBrige server URL (e.g. `http://192.168.1.100:7443`).

## What This Does

1. Creates `.openbrige/` config directory in your project
2. Adds OpenBrige MCP server to `.goose/config.yaml`
3. Adds OpenBrige instructions to the Goose session config

## Manual Setup

### MCP Server

Add this to your `.goose/config.yaml`:

```yaml
extensions:
  openbrige:
    name: openbrige
    type: stdio
    cmd: npx
    args:
      - "-y"
      - "@openbrige/cli"
      - "mcp"
      - "--server"
      - "<YOUR_SERVER_URL>"
```

### Agent Rules

Add the following to your Goose session instructions or `.goose/hints`:

```markdown
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

Start OpenBrige and launch Goose:
```bash
npx openbrige start goose
```

Open `http://<YOUR_SERVER_URL>` in your browser to monitor the session.
