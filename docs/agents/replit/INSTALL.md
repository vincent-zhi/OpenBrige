# OpenBrige Integration for Replit Agent

Replit Agent is a cloud-based AI coding agent. Since it runs in the Replit cloud, there are no local config files to create. Instead, provide OpenBrige connection details as instructions when you work with Replit Agent.

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup replit --server <YOUR_SERVER_URL>
```

## Manual Setup

Include the following instructions in your Replit Agent task prompt:

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

Make sure the OpenBrige server is accessible from the Replit cloud (use a public URL or tunnel such as ngrok, Cloudflare Tunnel, or FRP).

## Verify

Start OpenBrige and confirm Replit Agent can reach the server:

```bash
npx openbrige start replit --sandbox
```

Check the OpenBrige web UI at `<YOUR_SERVER_URL>` to see if events from Replit Agent appear.
