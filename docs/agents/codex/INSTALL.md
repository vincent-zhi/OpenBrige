# OpenBrige Integration for Codex

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup codex --server <YOUR_SERVER_URL>
```

## Manual Setup

Create `.codex/openbrige.json`:

```json
{
  "openbrige": {
    "serverUrl": "<YOUR_SERVER_URL>",
    "wsUrl": "ws://<YOUR_HOST>:<YOUR_PORT>"
  }
}
```

## Verify

Start OpenBrige and launch Codex:

```bash
npx openbrige start codex --sandbox
```
