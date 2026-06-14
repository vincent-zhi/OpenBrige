# OpenBrige Integration for OpenCode

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup opencode --server <YOUR_SERVER_URL>
```

## Manual Setup

Merge the following into `opencode.json` (if the file already exists, add the `openbrige` key to the existing object):

```json
{
  "openbrige": {
    "serverUrl": "<YOUR_SERVER_URL>",
    "wsUrl": "ws://<YOUR_HOST>:<YOUR_PORT>"
  }
}
```

If `opencode.json` does not exist, create it with the content above.

## Verify

Start OpenBrige and launch OpenCode:

```bash
npx openbrige start opencode --sandbox
```
