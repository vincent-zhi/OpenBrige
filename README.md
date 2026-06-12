<div align="center">

<br />

<img src="https://raw.githubusercontent.com/vincent-zhi/OpenBrige/main/docs/assets/banner.svg" alt="OpenBrige" width="100%" />

<br />
<br />

<pre align="center" style="background: transparent; border: none;">
╔══════════════════════════════════════════════════════════════╗
║  <b>Agent is a black box. OpenBrige is the cockpit.</b>            ║
╚══════════════════════════════════════════════════════════════╝
</pre>

<br />

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg?style=flat-square&color=6366f1)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-9-f69220?style=flat-square&logo=pnpm)](https://pnpm.io/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)

**Local-first web control plane for any AI coding agent**

[Quick Start](#quick-start) · [Features](#features) · [Architecture](#architecture) · [Plugins](#plugin-system) · [Roadmap](./docs/roadmap.md) · [Contributing](./CONTRIBUTING.md)

</div>

---

## What is OpenBrige?

OpenBrige runs on your computer and turns **any local AI coding agent** into a real-time, mobile-controlled workspace.

No cloud required. No vendor lock-in. No API keys.

```
┌─────────────────┐      WebSocket / HTTPS       ┌─────────────────┐
│   Your Phone    │  ◄─────────────────────────►  │   Your Computer │
│   (Browser)     │         Same Wi-Fi            │  (OpenBrige Host)
└─────────────────┘                               └────────┬────────┘
                                                          │
                    ┌─────────────┬─────────────┬─────────┘
                    ▼             ▼             ▼
              ┌─────────┐   ┌─────────┐   ┌─────────┐
              │  Claude │   │ Codex   │   │  Aider  │
              │  Code   │   │         │   │         │
              └─────────┘   └─────────┘   └─────────┘
```

**Monitor sessions, review diffs, manage worktrees, and send commands — all from your phone or browser.**

---

## Features

### Core

| Feature | Description |
|---------|-------------|
| **PTY Session Management** | Run any CLI agent in a managed terminal session with full I/O capture |
| **Real-time Monitoring** | Live timeline of agent activity, file changes, and git diffs |
| **Smart Cards** | Structured notifications for test failures, questions, errors, completions |
| **Diff Studio** | Mobile-optimized diff viewer with summaries, file grouping, hunk navigation |
| **Worktree Sandbox** | Isolate agent changes in git worktrees; merge when ready, discard when not |
| **Action Pad** | Context-aware quick actions — never type long prompts on mobile |

### Agent Support

Zero-config profiles for popular agents:

```bash
openbrige start claude-code --sandbox
openbrige start codex --sandbox
openbrige start opencode
openbrige start gemini-cli
openbrige start aider
```

Or bring your own agent with a simple YAML profile.

### Connection Methods

- **LAN Direct** — Same Wi-Fi, instant access
- **FRP** — Self-hosted reverse proxy
- **WireGuard / Headscale** — Private mesh network
- **SSH Reverse Tunnel** — Your own server as relay
- **QR Pairing** — Scan and connect in seconds

---

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start the host server and web UI
pnpm dev

# 3. Open in browser
open http://localhost:7443

# 4. Scan QR code with your phone (same Wi-Fi)
```

**One command to rule them all:**

```bash
npx openbrige start claude-code --sandbox
```

---

## Architecture

```
openbrige/
├── apps/
│   ├── web/                    # Mobile / Desktop PWA (React 19 + Vite)
│   └── host/                   # Local Host Server (Hono + WebSocket)
│
├── packages/
│   ├── cli/                    # CLI entry point
│   ├── pty-supervisor/         # PTY process management
│   ├── workspace-watcher/      # File system monitoring
│   ├── git-diff-engine/        # Git diff computation
│   ├── output-classifier/      # Terminal output → Smart Cards
│   ├── smart-cards/            # Card rendering and types
│   ├── worktree-manager/       # Git worktree sandbox
│   ├── connection-manager/     # Connection providers
│   ├── network-doctor/         # Connection diagnostics
│   ├── plugin-runtime/         # Plugin loading and execution
│   ├── local-store/            # SQLite event store
│   ├── session-recorder/       # Session replay
│   ├── notification-router/    # Notification routing
│   └── shared-types/           # Shared TypeScript types
│
├── plugins/
│   └── profiles/               # Agent profiles (YAML)
│       ├── claude-code/
│       ├── opencode/
│       ├── codex/
│       ├── gemini-cli/
│       ├── aider/
│       └── generic-shell/
│
└── docs/                       # Documentation
```

### Data Flow

```
Agent Process (PTY)
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ PTY Supervisor│────▶│    Output    │────▶│    Smart     │──▶ UI
│               │     │  Classifier  │     │    Cards     │
└──────┬────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│  Event Bus   │──▶ Local Store (SQLite) ──▶ Replay / Resync
└──────┬───────┘
       │
       ├──▶ WebSocket ──▶ Mobile / Web UI
       │
       └──▶ Plugin Runtime
```

---

## Plugin System

OpenBrige uses a **dual-track** model: the base layer (PTY + filesystem + git) works without any plugins. Plugins add enhanced capabilities.

| Type | Description | Example |
|------|-------------|---------|
| **Profile** | Zero-code YAML agent definitions | `claude-code`, `codex` |
| **UI Panel** | Custom panels in iframe / Web Worker | `diff-studio`, `test-report` |
| **Action** | Extend the Action Pad | `generate-commit`, `export-patch` |
| **Notification** | Push notifications | `ntfy`, `Gotify`, `webhook` |
| **Connection** | Alternative connection methods | `frp`, `wireguard`, `ssh-tunnel` |
| **Policy/Guard** | Control OpenBrige actions | `merge-guard`, `push-policy` |

See [Plugin System Docs](./docs/plugin-system.md) for the full API.

---

## Documentation

- [Quick Start](./docs/quickstart.md)
- [Architecture](./docs/architecture.md)
- [Profile Plugin Guide](./docs/profile-plugin.md)
- [Plugin System](./docs/plugin-system.md)
- [Worktree Sandbox](./docs/worktree-sandbox.md)
- [Connection Methods](./docs/connection.md)
- [Security](./docs/security.md)
- [Roadmap](./docs/roadmap.md)

---

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git

### Setup

```bash
git clone https://github.com/nicepkg/openbrige.git
cd openbrige
pnpm install
```

### Commands

```bash
pnpm dev           # Start all apps in parallel
pnpm dev:host      # Start host server only
pnpm dev:web       # Start web UI only
pnpm build         # Build all packages
pnpm test          # Run tests
pnpm lint          # Lint all packages
pnpm typecheck     # Type-check all packages
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, code style, and PR process.

---

## License

- **Core** (Host, Web, Runtime): [AGPL-3.0-or-later](./LICENSE)
- **Plugins, SDK, Types, Examples**: Apache-2.0
- **Documentation**: CC-BY-4.0

---

<div align="center">

**[⬆ Back to Top](#openbrige)**

<br />

<sub>Built with ❤️ by the OpenBrige team and contributors.</sub>

</div>
