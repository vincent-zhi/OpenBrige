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

## Why OpenBrige? / 为什么需要 OpenBrige？

> **Agent 是黑盒，OpenBrige 是驾驶舱。**

你正在用 Claude Code、Codex、Aider 或 Gemini CLI 在本地写代码。Agent 在终端里疯狂输出，你不得不盯着屏幕看它在做什么。它改了哪些文件？测试过了吗？要不要确认？你离开电脑去倒杯咖啡，回来发现它已经干了三件你没想到的事——有些是对的，有些需要回滚。

**OpenBrige 解决的就是这个痛点：**

- **手机上实时监控** — 不用守在电脑前，Agent 的一举一动尽在掌握
- **结构化事件流** — 不是看原始终端输出，而是看「文件修改」「测试失败」「等待确认」等结构化卡片
- **Worktree 沙箱隔离** — 让 Agent 大胆改，改坏了直接丢弃，改好了合并
- **一键快捷操作** — 手机上不用打字，点按钮就能发送预设指令

**无需云端。无供应商锁定。无需 API 密钥。**

### 5-Minute Demo / 5 分钟上手

```bash
# 1. 启动 OpenBrige 并运行 Claude Code（自动创建 Worktree 沙箱）
npx openbrige start claude-code --sandbox

# 2. 手机扫码连接，或在浏览器打开 https://<your-ip>:7443

# 3. 在手机上：
#    - 看 Agent 实时对话和终端输出
#    - 收到「文件修改」卡片，点「查看 Diff」
#    - 收到「测试失败」卡片，点「让 Agent 解释」
#    - 任务完成，点「生成 commit message」→「合并 sandbox」
```

---

## What is OpenBrige? / 什么是 OpenBrige？

OpenBrige 是一个运行在用户电脑上的开源本地服务器，把任意本地 AI Coding Agent 的终端会话变成实时、可控、可回放、可查看 diff、可移动操作的高级 Web 工作台。

它不依赖任何 Agent 厂商的内部能力，也不强制要求厂商接入。OpenBrige 通过 PTY、文件系统监听、Git diff、进程监督、智能输出识别、Worktree Sandbox、插件系统和移动端 UI，为所有本地 AI Agent 提供统一的控制层。

<img src="https://raw.githubusercontent.com/vincent-zhi/OpenBrige/main/docs/assets/architecture.svg" alt="Architecture" width="100%" />

**Monitor sessions, review diffs, manage worktrees, and send commands — all from your phone or browser.**

**监控会话、审查代码差异、管理工作区、发送指令 —— 一切尽在手机或浏览器中完成。**

---

## Quick Start / 快速开始

### Tell Your Agent to Install / 让 Agent 自己安装

Copy this prompt and paste it to your coding agent — it will identify itself and self-install:

复制这句话，粘贴给你的编程 Agent，它会自动识别自己并完成安装：

```
Install and configure OpenBrige for this project. Go to https://github.com/vincent-zhi/OpenBrige/tree/main/docs/agents/, find the folder that matches your agent name, read the INSTALL.md inside, and follow the instructions.
```

### One-liner / 一行命令

```bash
npx openbrige start claude-code --sandbox
```

### From Source / 从源码运行

```bash
git clone https://github.com/vincent-zhi/OpenBrige.git
cd OpenBrige
pnpm install
pnpm dev
```

### CLI Commands / 常用命令

```bash
openbrige init                          # 初始化配置
openbrige start <agent> --sandbox       # 启动 Agent（带沙箱）
openbrige session list                  # 查看会话列表
openbrige session open <id>             # 打开指定会话
openbrige doctor connect                # 诊断网络连接
openbrige plugin list                   # 列出已安装插件
openbrige profile list                  # 列出可用 Agent 配置
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
| **Session Replay** | Replay entire agent execution with seekable timeline |
| **会话回放** | 带时间轴的完整 Agent 执行过程回放 |
| **Connection Doctor** | Diagnose LAN, tunnel, certificate, and WebSocket issues |
| **连接诊断** | 诊断局域网、隧道、证书和 WebSocket 连接问题 |

### Agent Support / Agent 支持

17 agents supported. Tell your agent to self-install:

支持 17 个 Agent，一句话让 Agent 自己安装：

```
Install and configure OpenBrige for this project. Go to https://github.com/vincent-zhi/OpenBrige/tree/main/docs/agents/, find the folder that matches your agent name, read the INSTALL.md inside, and follow the instructions.
```

Supported agents: Claude Code, Cursor, GitHub Copilot, Codex, Windsurf, Cline, Gemini CLI, Aider, OpenCode, TRAE SOLO, Goose, Roo Code, Hermes, Continue, Devin, Replit, Antigravity

支持的 Agent：Claude Code、Cursor、GitHub Copilot、Codex、Windsurf、Cline、Gemini CLI、Aider、OpenCode、TRAE SOLO、Goose、Roo Code、Hermes、Continue、Devin、Replit、Antigravity

Or start manually:

或手动启动：

```bash
openbrige start claude-code --sandbox
openbrige start codex --sandbox
openbrige start opencode
openbrige start gemini-cli
openbrige start aider
```

### Connection Methods / 连接方式

| Method | Use Case |
|--------|----------|
| **LAN Direct / 局域网直连** | Same Wi-Fi, instant access. 同一 Wi-Fi，即时访问 |
| **FRP** | Self-hosted reverse proxy. 自托管反向代理 |
| **WireGuard / Headscale** | Private mesh network. 私有网状网络 |
| **SSH Reverse Tunnel / SSH 反向隧道** | Your own server as relay. 用自己的服务器作为中继 |
| **QR Pairing / 二维码配对** | Scan and connect in seconds. 扫码秒连 |

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

## Tech Highlights / 技术亮点

- **Local-first by design** — 所有数据默认保存在本机 SQLite，断网也能用
- **Universal Agent Bridge** — 不依赖任何 Agent 私有 API，通过 PTY 黑盒托管任意 CLI Agent
- **Real-time Event Bus** — WebSocket 推送 + 递增 seq 断线恢复，事件不丢失
- **Smart Output Classification** — 终端输出实时识别为「测试失败」「等待输入」「任务完成」等结构化状态
- **Git-native Sandbox** — Worktree 级别的隔离，不是复制文件，是 Git 原生能力
- **Plugin Runtime v0** — YAML Profile 零代码扩展，iframe/Web Worker 安全沙箱运行 UI 插件
- **Multi-transport Connection** — LAN、FRP、WireGuard、SSH Tunnel、Cloudflare Tunnel 统一抽象

## Documentation / 文档

| Document | Description |
|----------|-------------|
| [Quick Start / 快速开始](./docs/quickstart.md) | 5 分钟上手指南 |
| [Architecture / 架构](./docs/architecture.md) | 系统架构与模块说明 |
| [Profile Plugin Guide / 配置文件指南](./docs/profile-plugin.md) | 自定义 Agent 配置 |
| [Plugin System / 插件系统](./docs/plugin-system.md) | 插件开发完整 API |
| [Worktree Sandbox / Worktree 沙箱](./docs/worktree-sandbox.md) | 隔离工作区原理与使用 |
| [Connection Methods / 连接方式](./docs/connection.md) | 所有连接方式配置指南 |
| [Security / 安全](./docs/security.md) | 安全模型与最佳实践 |
| [Roadmap / 路线图](./docs/roadmap.md) | 版本规划与里程碑 |

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

## Community & Support / 社区与支持

- **Issues & Bugs**: [GitHub Issues](https://github.com/vincent-zhi/OpenBrige/issues)
- **Discussions**: [GitHub Discussions](https://github.com/vincent-zhi/OpenBrige/discussions)
- **Contributing**: See [CONTRIBUTING.md](./.github/CONTRIBUTING.md)

## Star History / Star 趋势

[![Star History Chart](https://api.star-history.com/svg?repos=vincent-zhi/OpenBrige&type=Date)](https://star-history.com/#vincent-zhi/OpenBrige&Date)

## License / 许可证

| Component | License |
|-----------|---------|
| **Core** (Host, Web, Runtime) | [AGPL-3.0-or-later](./LICENSE) |
| **Plugins, SDK, Types, Examples** | Apache-2.0 |
| **Documentation** | CC-BY-4.0 |
