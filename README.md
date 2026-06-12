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
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs" alt="Node.js"/></a>
</p>

---

## What is OpenBrige? / 什么是 OpenBrige？

OpenBrige turns **any local AI coding agent** into a real-time, mobile-controlled workspace.

OpenBrige 将**任何本地 AI 编程 Agent** 转变为实时、手机可控的工作空间。

No cloud required. No vendor lock-in. No API keys.

无需云端。无供应商锁定。无需 API 密钥。

<img src="https://raw.githubusercontent.com/vincent-zhi/OpenBrige/main/docs/assets/architecture.svg" alt="Architecture" width="100%" />

**Monitor sessions, review diffs, manage worktrees, and send commands — all from your phone or browser.**

**监控会话、审查代码差异、管理工作区、发送指令 —— 一切尽在手机或浏览器中完成。**

---

## Quick Start / 快速开始

```bash
# One command to rule them all / 一条命令搞定一切
npx openbrige start claude-code --sandbox
```

Or run from source / 或从源码运行：

```bash
git clone https://github.com/vincent-zhi/OpenBrige.git
cd OpenBrige
pnpm install
pnpm dev
```

---

## Features / 功能特性

### Core / 核心

| Feature | Description |
|---------|-------------|
| **PTY Session Management** | Run any CLI agent in a managed terminal session with full I/O capture |
| **PTY 会话管理** | 在受控终端会话中运行任何 CLI Agent，完整捕获输入输出 |
| **Real-time Monitoring** | Live timeline of agent activity, file changes, and git diffs |
| **实时监控** | Agent 活动、文件变更和 Git 差异的实时时间线 |
| **Smart Cards** | Structured notifications for test failures, questions, errors, completions |
| **智能卡片** | 针对测试失败、问题、错误、完成等场景的结构化通知 |
| **Diff Studio** | Mobile-optimized diff viewer with summaries, file grouping, hunk navigation |
| **Diff 工作室** | 为移动端优化的差异查看器，支持摘要、文件分组、代码块导航 |
| **Worktree Sandbox** | Isolate agent changes in git worktrees; merge when ready, discard when not |
| **Worktree 沙箱** | 在 Git Worktree 中隔离 Agent 的变更；就绪时合并，不需要时丢弃 |
| **Action Pad** | Context-aware quick actions — never type long prompts on mobile |
| **操作面板** | 上下文感知的快捷操作 —— 在手机上再也不用输入长指令 |

### Agent Support / Agent 支持

Zero-config profiles for popular agents:

热门 Agent 的零配置配置文件：

```bash
openbrige start claude-code --sandbox
openbrige start codex --sandbox
openbrige start opencode
openbrige start gemini-cli
openbrige start aider
```

Bring your own agent with a [YAML profile](./docs/profile-plugin.md).

通过 [YAML 配置文件](./docs/profile-plugin.md) 接入你自己的 Agent。

### Connection Methods / 连接方式

- **LAN Direct / 局域网直连** — Same Wi-Fi, instant access. 同一 Wi-Fi，即时访问
- **FRP** — Self-hosted reverse proxy. 自托管反向代理
- **WireGuard / Headscale** — Private mesh network. 私有网状网络
- **SSH Reverse Tunnel / SSH 反向隧道** — Your own server as relay. 用自己的服务器作为中继
- **QR Pairing / 二维码配对** — Scan and connect in seconds. 扫码秒连

---

## Architecture / 架构

```
openbrige/
├── apps/
│   ├── web/                    # Mobile / Desktop PWA (React 19 + Vite)
│   │                           # 移动端 / 桌面端 PWA（React 19 + Vite）
│   └── host/                   # Local Host Server (Hono + WebSocket)
│                               # 本地 Host 服务器（Hono + WebSocket）
│
├── packages/
│   ├── cli/                    # CLI entry point / CLI 入口
│   ├── pty-supervisor/         # PTY process management / PTY 进程管理
│   ├── workspace-watcher/      # File system monitoring / 文件系统监听
│   ├── git-diff-engine/        # Git diff computation / Git 差异计算
│   ├── output-classifier/      # Terminal output → Smart Cards / 终端输出分类
│   ├── smart-cards/            # Card rendering and types / 智能卡片渲染
│   ├── worktree-manager/       # Git worktree sandbox / Worktree 沙箱管理
│   ├── connection-manager/     # Connection providers / 连接提供者
│   ├── network-doctor/         # Connection diagnostics / 网络诊断
│   ├── plugin-runtime/         # Plugin loading and execution / 插件运行时
│   ├── local-store/            # SQLite event store / SQLite 事件存储
│   ├── session-recorder/       # Session replay / 会话录制回放
│   ├── notification-router/    # Notification routing / 通知路由
│   └── shared-types/           # Shared TypeScript types / 共享类型定义
│
├── plugins/
│   └── profiles/               # Agent profiles (YAML) / Agent 配置文件（YAML）
│       ├── claude-code/
│       ├── opencode/
│       ├── codex/
│       ├── gemini-cli/
│       ├── aider/
│       └── generic-shell/
│
└── docs/                       # Documentation / 文档
```

### Data Flow / 数据流

```
Agent Process (PTY) / Agent 进程（PTY）
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ PTY Supervisor│────▶│    Output    │────▶│    Smart     │──▶ UI
│ PTY 监管器    │     │  Classifier  │     │    Cards     │
│               │     │  输出分类器   │     │   智能卡片    │
└──────┬────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│  Event Bus   │──▶ Local Store (SQLite) ──▶ Replay / Resync
│  事件总线     │     │ 本地存储（SQLite）      │ 回放 / 重新同步
└──────┬───────┘
       │
       ├──▶ WebSocket ──▶ Mobile / Web UI
       │                   移动端 / Web UI
       │
       └──▶ Plugin Runtime
             插件运行时
```

---

## Plugin System / 插件系统

OpenBrige uses a **dual-track** model: the base layer (PTY + filesystem + git) works without any plugins. Plugins add enhanced capabilities.

OpenBrige 采用**双轨**模型：基础层（PTY + 文件系统 + Git）无需任何插件即可工作。插件则增强额外能力。

| Type | Description | Example |
|------|-------------|---------|
| **Profile / 配置文件** | Zero-code YAML agent definitions | `claude-code`, `codex` |
| **UI Panel / UI 面板** | Custom panels in iframe / Web Worker | `diff-studio`, `test-report` |
| **Action / 操作** | Extend the Action Pad | `generate-commit`, `export-patch` |
| **Notification / 通知** | Push notifications | `ntfy`, `Gotify`, `webhook` |
| **Connection / 连接** | Alternative connection methods | `frp`, `wireguard`, `ssh-tunnel` |
| **Policy/Guard / 策略/守卫** | Control OpenBrige actions | `merge-guard`, `push-policy` |

See [Plugin System Docs](./docs/plugin-system.md) for the full API.

查看[插件系统文档](./docs/plugin-system.md)获取完整 API。

---

## Documentation / 文档

- [Quick Start / 快速开始](./docs/quickstart.md)
- [Architecture / 架构](./docs/architecture.md)
- [Profile Plugin Guide / 配置文件指南](./docs/profile-plugin.md)
- [Plugin System / 插件系统](./docs/plugin-system.md)
- [Worktree Sandbox / Worktree 沙箱](./docs/worktree-sandbox.md)
- [Connection Methods / 连接方式](./docs/connection.md)
- [Security / 安全](./docs/security.md)
- [Roadmap / 路线图](./docs/roadmap.md)

---

## Development / 开发

### Prerequisites / 前置条件

- Node.js 20+
- pnpm 9+
- Git

### Setup / 安装

```bash
git clone https://github.com/vincent-zhi/OpenBrige.git
cd OpenBrige
pnpm install
```

### Commands / 命令

```bash
pnpm dev           # Start all apps in parallel / 并行启动所有应用
pnpm dev:host      # Start host server only / 仅启动 Host 服务器
pnpm dev:web       # Start web UI only / 仅启动 Web UI
pnpm build         # Build all packages / 构建所有包
pnpm test          # Run tests / 运行测试
pnpm lint          # Lint all packages / 检查所有包
pnpm typecheck     # Type-check all packages / 类型检查所有包
```

---

## Contributing / 贡献

See [CONTRIBUTING.md](./.github/CONTRIBUTING.md) for development setup, code style, and PR process.

查看 [CONTRIBUTING.md](./.github/CONTRIBUTING.md) 了解开发环境配置、代码规范和 PR 流程。

---

## License / 许可证

- **Core** (Host, Web, Runtime): [AGPL-3.0-or-later](./LICENSE)
- **核心**（Host, Web, Runtime）：[AGPL-3.0-or-later](./LICENSE)
- **Plugins, SDK, Types, Examples**: Apache-2.0
- **插件、SDK、类型、示例**：Apache-2.0
- **Documentation**: CC-BY-4.0
- **文档**：CC-BY-4.0
