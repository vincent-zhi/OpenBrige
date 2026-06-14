# OpenBrige Integration for Aider

## Quick Install

Run this command in your project directory:

```bash
npx @openbrige/cli@latest setup aider --server <YOUR_SERVER_URL>
```

## Manual Setup

Append the following section to `.aider.conf.yml`:

```yaml
# OpenBrige Integration
# Server: <YOUR_SERVER_URL>
```

If `.aider.conf.yml` does not exist, create it with the content above.

## Verify

Start OpenBrige and launch Aider:

```bash
npx openbrige start aider --sandbox
```
