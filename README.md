<p align="center">
  <img src="https://raw.githubusercontent.com/vincent-zhi/OpenBrige/main/docs/assets/banner.svg" alt="OpenBrige" width="100%" />
</p>

<p align="center">
  <b>Local-first control plane for AI coding agents</b><br/>
  <sub>本地优先的 AI 编程 Agent 控制台</sub>
</p>

<p align="center">
  <a href="https://www.gnu.org/licenses/agpl-3.0"><img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg?style=flat-square&color=0d9488" alt="License: AGPL v3"/></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript" alt="TypeScript"/></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React"/></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-9-f69220?style=flat-square&logo=pnpm" alt="pnpm"/></a>
</p>

---

## What is OpenBrige?

OpenBrige turns **any local AI coding agent** into a real-time, mobile-controlled workspace. No cloud required. No vendor lock-in.

OpenBrige 将**任何本地 AI 编程 Agent** 转变为实时、手机可控的工作空间。无需云端，无供应商锁定。

<img src="https://raw.githubusercontent.com/vincent-zhi/OpenBrige/main/docs/assets/architecture.svg" alt="Architecture" width="100%" />

## Quick Start

```bash
npx openbrige start claude-code --sandbox
```

Or run from source / 或从源码运行：

```bash
git clone https://github.com/vincent-zhi/OpenBrige.git
cd OpenBrige
pnpm install
pnpm dev
```

## Features

| Feature | Description |
|---------|-------------|
| **PTY Session Management** | Run any CLI agent with full I/O capture. 在受控终端中运行任何 CLI Agent，完整捕获输入输出。 |
| **Real-time Monitoring** | Live timeline of agent activity, file changes, and git diffs. Agent 活动、文件变更和 Git 差异的实时时间线。 |
| **Smart Cards** | Structured notifications for test failures, errors, completions. 针对测试失败、错误、完成等场景的结构化通知。 |
| **Diff Studio** | Mobile-optimized diff viewer with summaries and hunk navigation. 为移动端优化的差异查看器，支持摘要和代码块导航。 |
| **Worktree Sandbox** | Isolate agent changes in git worktrees. 在 Git Worktree 中隔离 Agent 变更，就绪时合并，不需要时丢弃。 |
| **Action Pad** | Context-aware quick actions for mobile. 上下文感知的快捷操作，在手机上再也不用输入长指令。 |

## Supported Agents

```bash
openbrige start claude-code --sandbox
openbrige start codex --sandbox
openbrige start opencode
openbrige start gemini-cli
openbrige start aider
```

Bring your own agent with a [YAML profile](./docs/profile-plugin.md).

通过 [YAML 配置文件](./docs/profile-plugin.md) 接入你自己的 Agent。

## Architecture

```
openbrige/
├── apps/
│   ├── web/          # React 19 + Vite PWA
│   └── host/         # Hono + WebSocket server
├── packages/
│   ├── cli/          # CLI entry
│   ├── pty-supervisor/
│   ├── workspace-watcher/
│   ├── git-diff-engine/
│   ├── smart-cards/
│   ├── worktree-manager/
│   ├── plugin-runtime/
│   └── ...
├── plugins/
│   └── profiles/     # Agent YAML profiles
└── docs/
```

## Documentation

- [Quick Start](./docs/quickstart.md)
- [Architecture](./docs/architecture.md)
- [Plugin System](./docs/plugin-system.md)
- [Worktree Sandbox](./docs/worktree-sandbox.md)
- [Connection Methods](./docs/connection.md)
- [Security](./docs/security.md)
- [Roadmap](./docs/roadmap.md)

## Development

```bash
pnpm dev           # Start all apps
pnpm dev:host      # Host server only
pnpm dev:web       # Web UI only
pnpm build         # Build all packages
pnpm test          # Run tests
pnpm lint          # Lint all packages
```

## Contributing

See [CONTRIBUTING.md](./.github/CONTRIBUTING.md).

## License

- **Core** (Host, Web, Runtime): [AGPL-3.0-or-later](./LICENSE)
- **Plugins, SDK, Types, Examples**: Apache-2.0
- **Documentation**: CC-BY-4.0
