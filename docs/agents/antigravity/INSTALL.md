# OpenBrige Integration for Antigravity

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup antigravity --server <YOUR_SERVER_URL>
```

## Manual Setup

Create `.antigravity/openbrige.json`:

```json
{
  "openbrige": {
    "serverUrl": "<YOUR_SERVER_URL>",
    "wsUrl": "ws://<YOUR_HOST>:<YOUR_PORT>"
  }
}
```

## Verify

Start OpenBrige and launch Antigravity:

```bash
npx openbrige start antigravity --sandbox
```
