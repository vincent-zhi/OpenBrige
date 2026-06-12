# Architecture

## System Overview

```text
┌─────────────────────────────────────────────────────┐
│            Mobile / Web Control UI (PWA)             │
│  ┌───────────┬───────────┬───────────┬────────────┐  │
│  │  Agent    │   Live    │   Diff    │   Action   │  │
│  │  Inbox    │  Session  │  Studio   │    Pad     │  │
│  ├───────────┼───────────┼───────────┼────────────┤  │
│  │ Timeline  │   Smart   │  Plugin   │   Device   │  │
│  │  Replay   │   Cards   │  Panels   │  Manager   │  │
│  └───────────┴───────────┴───────────┴────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS / WSS
                       ▼
┌─────────────────────────────────────────────────────┐
│              OpenBrige Host Server                    │
│  ┌──────────────────────────────────────────────┐    │
│  │           Realtime Event Bus                  │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Session    │  │     PTY      │  │  Workspace │ │
│  │  Supervisor  │  │   Stream     │  │  Watcher   │ │
│  │              │  │  Collector   │  │            │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │     Git      │  │    Output    │  │   Worktree │ │
│  │    Diff      │  │  Classifier  │  │   Sandbox  │ │
│  │   Engine     │  │              │  │            │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Plugin     │  │  Connection  │  │   Local    │ │
│  │   Runtime    │  │   Manager    │  │   Store    │ │
│  │              │  │              │  │  (SQLite)  │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐     ┌──────────────────┐
│  CLI Agents      │     │  Optional        │
│  (PTY processes) │     │  Plugins         │
│                  │     │                  │
│  claude          │     │  Profiles        │
│  opencode        │     │  UI Panels       │
│  codex           │     │  Notifications   │
│  gemini          │     │  Connections     │
│  aider           │     │  Actions         │
│  any CLI         │     │  Policies        │
└──────────────────┘     └──────────────────┘
```

## Package Descriptions

### Apps

| Package | Description |
|---------|-------------|
| `apps/host` | Local Host Server — the core runtime. Manages sessions, PTY processes, filesystem watchers, git operations, and serves the API/WebSocket. |
| `apps/web` | Mobile/Desktop PWA — the control interface. Connects to the host via HTTPS/WSS and renders the Agent Inbox, timelines, diff views, and action pads. |

### Packages

| Package | Description |
|---------|-------------|
| `cli` | CLI entry point for `openbrige` commands (init, start, doctor, plugin, etc.) |
| `pty-supervisor` | Manages PTY processes for agent sessions. Handles stdout/stderr capture, stdin forwarding, terminal resize, and process lifecycle. |
| `workspace-watcher` | Watches the working directory for file changes (created, modified, deleted, renamed). Detects large/binary/sensitive file changes. |
| `git-diff-engine` | Computes git diffs, changed files, insertions/deletions, staged/unstaged state, branch info, and worktree status. |
| `output-classifier` | Analyzes terminal output to classify agent state (thinking, waiting_input, test_failed, etc.) and generates Smart Cards. |
| `smart-cards` | Defines card types (question, test_result, file_change, error, completion) and renders structured notifications. |
| `worktree-manager` | Creates and manages git worktree sandboxes for isolated agent sessions. Handles merge, discard, and patch export. |
| `connection-manager` | Manages connection providers (LAN, FRP, WireGuard, SSH tunnel) and device pairing. |
| `network-doctor` | Diagnoses connectivity issues — firewall, DNS, certificates, WebSocket, mDNS. |
| `plugin-runtime` | Loads, validates, and executes plugins. Manages plugin permissions and lifecycle. |
| `local-store` | SQLite-based event store for sessions, events, files, smart cards, and connections. Supports replay and cursor-based resync. |
| `shared-types` | Shared TypeScript types and interfaces used across all packages. |

### Plugins

| Package | Description |
|---------|-------------|
| `plugins/profiles/*` | YAML-based agent profiles defining commands, patterns, UI hints, and quick actions. |

## Data Flow

```text
Agent Process (PTY)
       │
       ▼
┌──────────────┐
│ PTY Supervisor│──→ stdout/stderr/stdin streams
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│    Output    │──→  │    Smart     │──→  Card pushed to UI
│  Classifier  │     │    Cards     │
└──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│  Event Bus   │──→ All internal modules write events here
└──────┬───────┘
       │
       ├──→ Local Store (SQLite) — persistent, supports replay
       │
       ├──→ WebSocket — real-time push to UI clients
       │
       └──→ Plugin Runtime — plugins receive and emit events

Workspace Watcher ──→ Event Bus (file change events)
Git Diff Engine   ──→ Event Bus (diff update events)
```

### Detailed Flow

1. **PTY Output** — `pty-supervisor` captures raw terminal output from the agent process
2. **Classification** — `output-classifier` analyzes the output stream and detects state changes (waiting for input, test results, errors, etc.)
3. **Smart Cards** — When a significant event is detected, a Smart Card is created and emitted
4. **File Watching** — `workspace-watcher` detects filesystem changes independently of PTY output
5. **Diff Computation** — `git-diff-engine` computes diffs when files change, producing summaries and hunk data
6. **Event Bus** — All events flow through the internal event bus
7. **Persistence** — `local-store` writes events to SQLite for replay and cursor-based resync
8. **WebSocket Push** — Events are pushed to connected UI clients in real-time
9. **UI Rendering** — The web app renders events as timeline cards, Smart Cards, diff views, and action pads

## Event Model

All internal events flow through the Event Bus:

```typescript
type BridgeEvent =
  | { type: "session.created"; session: BridgeSession }
  | { type: "session.status.changed"; sessionId: string; status: SessionStatus }
  | { type: "pty.output"; sessionId: string; data: string }
  | { type: "user.input"; sessionId: string; text: string }
  | { type: "workspace.file.changed"; sessionId: string; path: string }
  | { type: "git.diff.updated"; sessionId: string; summary: DiffSummary }
  | { type: "classifier.card.created"; sessionId: string; card: SmartCard }
  | { type: "plugin.event"; sessionId: string; payload: unknown };
```

Each event has a monotonically increasing sequence number (`seq`). UI clients can reconnect with a cursor to receive missed events.

## Session Lifecycle

```text
  ┌──────────┐
  │ starting │  Session created, PTY process spawning
  └────┬─────┘
       │
       ▼
  ┌──────────┐
  │ thinking │  Agent is processing / reasoning
  └────┬─────┘
       │
       ▼
  ┌──────────┐     ┌──────────────┐
  │ running  │────▶│   editing    │  Agent is modifying files
  └────┬─────┘     └──────────────┘
       │
       ▼
  ┌──────────┐
  │ testing  │  Agent is running tests
  └────┬─────┘
       │
       ├──▶ waiting_input — Agent needs user confirmation
       ├──▶ needs_attention — Error or blocking issue detected
       ├──▶ paused — User paused the session
       │
       ▼
  ┌──────────┐
  │completed │  Task finished successfully
  └──────────┘

  ┌──────────┐
  │ failed   │  Task failed with error
  └──────────┘

  ┌──────────┐
  │ aborted  │  User cancelled the session
  └──────────┘
```

Session status is derived from multiple sources:

- PTY output patterns
- Filesystem change signals
- Git diff state
- Process exit codes
- Plugin events
- User actions (pause, resume, abort)
