# Quick Start

Get OpenBrige running in under 5 minutes.

## Prerequisites

- **Node.js** 20 or later
- **pnpm** 9 or later
- **Git**

## Install

```bash
git clone https://github.com/nicepkg/openbrige.git
cd openbrige
pnpm install
```

## Start the Server

```bash
pnpm dev
```

This starts both the Host Server and Web UI in parallel. You'll see output like:

```text
OpenBrige
────────────────────────
✓ Host Server started
✓ Web UI available
✓ Local network detected
✓ Profiles loaded: claude-code, opencode, codex, aider
✓ Worktree sandbox enabled

Open on this computer:
  http://localhost:7443

Open on your phone:
  https://192.168.1.23:7443

Scan QR:
[ QR Code ]
```

## Open in Browser

Navigate to `http://localhost:7443` in your browser. You'll see the Agent Inbox — the home screen showing all active, waiting, and completed sessions.

## Create Your First Session

1. Click **New Session** on the Agent Inbox
2. Select an agent profile (e.g., `claude-code`)
3. Choose a working directory
4. Optionally enable **Worktree Sandbox** for isolated changes
5. Click **Start**

The session opens with a live timeline showing agent output, file changes, and Smart Cards.

## Mobile Access via LAN

If your phone and computer are on the same Wi-Fi network:

1. Open the URL shown in the terminal (e.g., `https://192.168.1.23:7443`)
2. Or scan the QR code displayed in the terminal
3. Approve the pairing request on your computer
4. You're connected

The mobile UI is purpose-built for on-the-go monitoring with an Action Pad for quick commands.

## QR Code Pairing

When a new device connects, OpenBrige generates a one-time pairing token:

1. The new device shows a pairing request
2. Approve it on a trusted device or the host terminal
3. The token expires after 5 minutes
4. Once paired, the device is remembered

## Next Steps

- [Architecture Overview](./architecture.md) — Understand how OpenBrige works
- [Profile Plugin Guide](./profile-plugin.md) — Customize agent behavior
- [Worktree Sandbox](./worktree-sandbox.md) — Isolate agent changes
- [Connection Methods](./connection.md) — Connect from outside your LAN
