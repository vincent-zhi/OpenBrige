# OpenBrige Integration for TRAE SOLO

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup trae --server <YOUR_SERVER_URL>
```

## Manual Setup

Create `.trae/rules/openbrige.md`:

```markdown
## OpenBrige Integration

This project uses OpenBrige for remote monitoring and control.
OpenBrige server: <YOUR_SERVER_URL>
WebSocket URL: ws://<YOUR_HOST>:<YOUR_PORT>
You can use the OpenBrige MCP server to report progress and get instructions.
```

## Verify

Start OpenBrige and launch TRAE SOLO:

```bash
npx openbrige start trae --sandbox
```
