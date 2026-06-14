# OpenBrige Integration for Devin

Devin is a cloud-based AI software engineer. Since it runs remotely, there are no local config files to create. Instead, provide OpenBrige connection details as instructions when you assign tasks to Devin.

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup devin --server <YOUR_SERVER_URL>
```

## Manual Setup

Include the following instructions in your Devin task prompt:

```
This project uses OpenBrige for remote monitoring and control.

OpenBrige server: <YOUR_SERVER_URL>
API Endpoint: <YOUR_SERVER_URL>/api
WebSocket: ws://<YOUR_HOST>:<YOUR_PORT>

Instructions:
- Report your progress periodically using the OpenBrige API
- When you complete a task, notify OpenBrige via POST /api/events
- If you encounter errors, report them to OpenBrige for remote monitoring
```

## Verify

Start OpenBrige and confirm Devin can reach the server:

```bash
npx openbrige start devin --sandbox
```

Check the OpenBrige web UI at `<YOUR_SERVER_URL>` to see if events from Devin appear.
