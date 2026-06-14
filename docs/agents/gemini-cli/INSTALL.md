# OpenBrige Integration for Gemini CLI

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup gemini-cli --server <YOUR_SERVER_URL>
```

## Manual Setup

Create `.gemini/openbrige.json`:

```json
{
  "openbrige": {
    "serverUrl": "<YOUR_SERVER_URL>",
    "wsUrl": "ws://<YOUR_HOST>:<YOUR_PORT>"
  }
}
```

## Verify

Start OpenBrige and launch Gemini CLI:

```bash
npx openbrige start gemini-cli --sandbox
```
