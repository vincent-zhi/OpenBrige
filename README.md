<div align="center">

<br />

<img src="https://raw.githubusercontent.com/vincent-zhi/OpenBrige/main/docs/assets/banner.svg" alt="OpenBrige" width="100%" />

<br />

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg?style=flat-square&color=6366f1)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-9-f69220?style=flat-square&logo=pnpm)](https://pnpm.io/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)

**Local-first web control plane for any AI coding agent**<br/>
**本地优先的 AI 编程 Agent 通用 Web 控制台**

[Quick Start](#quick-start) · [Features](#features) · [Architecture](#architecture) · [Plugins](#plugin-system) · [Roadmap](./docs/roadmap.md) · [Contributing](./CONTRIBUTING.md)

</div>

---

## What is OpenBrige? / 什么是 OpenBrige？

OpenBrige runs on your computer and turns **any local AI coding agent** into a real-time, mobile-controlled workspace.

OpenBrige 运行在你的电脑上，将**任何本地 AI 编程 Agent** 转变为实时、手机可控的工作空间。

No cloud required. No vendor lock-in. No API keys.

无需云端。无供应商锁定。无需 API 密钥。

<img src="https://raw.githubusercontent.com/vincent-zhi/OpenBrige/main/docs/assets/architecture.svg" alt="Architecture" width="100%" />

**Monitor sessions, review diffs, manage worktrees, and send commands — all from your phone or browser.**

**监控会话、审查代码差异、管理工作区、发送指令 —— 一切尽在手机或浏览器中完成。**

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

Or bring your own agent with a simple YAML profile.

或者通过简单的 YAML 配置文件接入你自己的 Agent。

### Connection Methods / 连接方式

- **LAN Direct** — Same Wi-Fi, instant access
- **局域网直连** — 同一 Wi-Fi，即时访问
- **FRP** — Self-hosted reverse proxy
- **FRP** — 自托管反向代理
- **WireGuard / Headscale** — Private mesh network
- **WireGuard / Headscale** — 私有网状网络
- **SSH Reverse Tunnel** — Your own server as relay
- **SSH 反向隧道** — 用自己的服务器作为中继
- **QR Pairing** — Scan and connect in seconds
- **二维码配对** — 扫码秒连

---

## Quick Start / 快速开始

```bash
# 1. Install dependencies / 安装依赖
pnpm install

# 2. Start the host server and web UI / 启动 Host 服务器和 Web UI
pnpm dev

# 3. Open in browser / 在浏览器中打开
open http://localhost:7443

# 4. Scan QR code with your phone (same Wi-Fi) / 用手机扫描二维码（同一 Wi-Fi）
```

**One command to rule them all / 一条命令搞定一切：**

```bash
npx openbrige start claude-code --sandbox
```

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
| **Profile** | Zero-code YAML agent definitions | `claude-code`, `codex` |
| **配置文件** | 零代码 YAML Agent 定义 | `claude-code`, `codex` |
| **UI Panel** | Custom panels in iframe / Web Worker | `diff-studio`, `test-report` |
| **UI 面板** | iframe / Web Worker 中的自定义面板 | `diff-studio`, `test-report` |
| **Action** | Extend the Action Pad | `generate-commit`, `export-patch` |
| **操作** | 扩展操作面板 | `generate-commit`, `export-patch` |
| **Notification** | Push notifications | `ntfy`, `Gotify`, `webhook` |
| **通知** | 推送通知 | `ntfy`, `Gotify`, `webhook` |
| **Connection** | Alternative connection methods | `frp`, `wireguard`, `ssh-tunnel` |
| **连接** | 替代连接方式 | `frp`, `wireguard`, `ssh-tunnel` |
| **Policy/Guard** | Control OpenBrige actions | `merge-guard`, `push-policy` |
| **策略/守卫** | 控制 OpenBrige 操作 | `merge-guard`, `push-policy` |

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

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, code style, and PR process.

查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解开发环境配置、代码规范和 PR 流程。

---

## License / 许可证

- **Core** (Host, Web, Runtime): [AGPL-3.0-or-later](./LICENSE)
- **核心**（Host, Web, Runtime）：[AGPL-3.0-or-later](./LICENSE)
- **Plugins, SDK, Types, Examples**: Apache-2.0
- **插件、SDK、类型、示例**：Apache-2.0
- **Documentation**: CC-BY-4.0
- **文档**：CC-BY-4.0

---

<div align="center">

**[⬆ Back to Top / 回到顶部](#openbrige)**

<br />

<sub>Built with ❤️ by the OpenBrige team and contributors.<br/>
由 OpenBrige 团队和贡献者用 ❤️ 打造。</sub>

</div>
