# OpenBrige Integration for GitHub Copilot

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup copilot --server <YOUR_SERVER_URL>
```

## Manual Setup

Create `.github/copilot/openbrige.md`:

```markdown
# OpenBrige Integration

This project uses OpenBrige for remote monitoring and control.
OpenBrige server: <YOUR_SERVER_URL>

## Instructions
- Report your progress periodically using the OpenBrige API
- When you complete a task, notify OpenBrige via the API endpoint
- If you encounter errors, report them to OpenBrige for remote monitoring

API Endpoint: <YOUR_SERVER_URL>/api
WebSocket: ws://<YOUR_HOST>:<YOUR_PORT>
```

## Verify

Start OpenBrige and launch Copilot:

```bash
npx openbrige start copilot --sandbox
```
