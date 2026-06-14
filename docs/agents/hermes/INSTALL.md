# OpenBrige Integration for Hermes Agent

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup hermes --server <YOUR_SERVER_URL>
```

## Manual Setup

Create `.hermes/config.json`:

```json
{
  "openbrige": {
    "serverUrl": "<YOUR_SERVER_URL>",
    "wsUrl": "ws://<YOUR_HOST>:<YOUR_PORT>"
  }
}
```

## Verify

Start OpenBrige and launch Hermes Agent:

```bash
npx openbrige start hermes --sandbox
```
