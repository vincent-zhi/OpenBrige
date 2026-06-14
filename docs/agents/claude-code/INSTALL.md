# OpenBrige Integration for Claude Code

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup claude-code --server <YOUR_SERVER_URL>
```

Replace `<YOUR_SERVER_URL>` with your OpenBrige server URL (e.g. `http://192.168.1.100:7443`).

## What This Does

1. Creates `.openbrige/` config directory in your project
2. Adds OpenBrige MCP server to `.claude/settings.json`
3. Adds OpenBrige instructions to `CLAUDE.md`

## Manual Setup

If you prefer to configure manually, add this to your `.claude/settings.json`:

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

## MCP Tools Available

After setup, you can use these tools:
- **report_progress** — Report your current progress to OpenBrige
- **get_instructions** — Get OpenBrige instructions for this project
- **send_event** — Send a custom event to OpenBrige

## Verify

After setup, start OpenBrige and launch Claude Code:
```bash
npx openbrige start claude-code --sandbox
```

Open `http://<YOUR_SERVER_URL>` in your browser to monitor the session.
