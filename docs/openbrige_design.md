# OpenBrige 开源产品与工程设计文档

版本：v0.1  
状态：开源启动版设计稿  
定位：Local-first AI Agent Session Bridge / 本地 AI Agent 移动与网页控制台  
项目名：OpenBrige  
核心理念：Agent 是黑盒，OpenBrige 是驾驶舱。

---

## 1. 一句话定义

OpenBrige 是一个运行在用户电脑上的开源本机服务器，把任意本地 AI Coding Agent 的终端会话变成实时、可控、可回放、可查看 diff、可移动操作的高级 Web 工作台。

它不依赖任何 Agent 厂商的内部能力，也不强制要求厂商接入。OpenBrige 通过 PTY、文件系统监听、Git diff、进程监督、智能输出识别、Worktree Sandbox、插件系统和移动端 UI，为所有本地 AI Agent 提供统一的控制层。

---

## 2. 产品哲学

```text
Agent 是黑盒，OpenBrige 是驾驶舱。
```

OpenBrige 不做 Agent，不替代 Claude Code、OpenCode、Codex、Gemini CLI、Aider 或其他工具。OpenBrige 做所有 Agent 都缺的那一层：

1. 实时感知。
2. 移动控制。
3. 会话管理。
4. 文件改动理解。
5. Diff 展示。
6. 工作区隔离。
7. 任务回放。
8. 通知。
9. 连接。
10. 插件扩展。

核心原则：

1. 不绑定任何 Agent 厂商。
2. 不依赖任何 Agent 私有 API。
3. 不默认使用云服务。
4. 电脑是服务器。
5. 手机和浏览器是控制台。
6. 所有数据默认保存在本机。
7. 没有插件也要好用。
8. 有插件时体验更强。
9. 网页端体验必须做到顶级。
10. 开源版必须完整可用。

---

## 3. 项目目标

### 3.1 用户目标

用户可以通过手机或 Web 浏览器完成：

1. 启动任意本地 AI Agent。
2. 实时查看 Agent 对话与终端输出。
3. 查看 Agent 当前进度。
4. 查看文件变化。
5. 查看 Git diff 摘要和完整 diff。
6. 给 Agent 发送指令。
7. 使用快捷操作，而不是在手机上输入长 prompt。
8. 在测试失败、等待输入、任务完成时收到卡片化提示。
9. 使用 Worktree Sandbox 隔离 Agent 改动。
10. 查看会话时间线。
11. 回放整个 Agent 执行过程。
12. 导出 patch、生成 commit message、生成 PR description。
13. 通过 LAN、FRP、WireGuard、SSH Tunnel 等方式连接电脑。
14. 安装社区插件扩展 UI、通知、连接和 Agent profile。

### 3.2 开源目标

1. 做成 Local-first 的开源基础设施。
2. 让任何 AI Agent 都能被 OpenBrige 控制。
3. 降低社区贡献门槛，优先支持 YAML Profile 插件。
4. 通过插件生态扩展到不同 Agent、不同通知渠道、不同连接方式、不同 UI 面板。
5. 做出足够惊艳的开源 Demo，推动用户和厂商主动接入。
6. 不靠锁核心能力商业化。
7. 建立“本地 Agent 控制台”的事实标准。

### 3.3 工程目标

1. 一条命令启动本机 Host Server。
2. 手机扫码连接。
3. 不依赖云服务即可在同一局域网使用。
4. 通过 PTY 托管任意 CLI Agent。
5. 通过 Workspace Watcher 实时发现文件变动。
6. 通过 Git Diff Engine 实时展示改动。
7. 通过 Output Classifier 把终端输出转成 Smart Cards。
8. 通过 Event Store 支持断线恢复和会话回放。
9. 通过 Worktree Sandbox 保护主工作区。
10. 通过 Plugin Runtime 扩展 profile、UI panel、action、notification、connection。

---

## 4. 非目标

OpenBrige 首版不做以下事情：

1. 不深度依赖 Claude Code / OpenCode / Codex 私有 SDK。
2. 不修改 Agent 原生配置，但提供/brige的插件
3. 不拦截 Agent 内部每个 tool call。
4. 不承诺替代 Agent 原生权限系统。
5. 不把源码上传到第三方云服务。
6. 不做云端 Agent 执行。
8. 不在 MVP 做复杂企业控制台。
9. 不把手机端做成简单远程终端镜像。
10. 不把商业功能锁在核心路径上。

---

## 5. 总体架构

```text
Mobile / Web Control UI
  ├─ Agent Inbox
  ├─ Live Session
  ├─ Timeline Replay
  ├─ Diff Studio
  ├─ Task Board
  ├─ Action Pad
  ├─ Notifications
  ├─ Plugin Panels
  └─ Device / Connection Manager

        │ HTTPS / WSS / Local-first
        ▼

OpenBrige Host Server
  ├─ Realtime Event Bus
  ├─ Session Supervisor
  ├─ PTY Stream Collector
  ├─ Workspace Watcher
  ├─ Git Diff Engine
  ├─ Output Classifier
  ├─ Timeline Recorder
  ├─ Plugin Runtime
  ├─ Worktree Sandbox
  ├─ Connection Manager
  ├─ Notification Router
  └─ Local Event Store

        │
        ├─ Universal Black-box Agents
        │   ├─ claude
        │   ├─ opencode
        │   ├─ codex
        │   ├─ gemini
        │   ├─ aider
        │   ├─ cursor-agent
        │   └─ custom-agent
        │
        └─ Optional Plugins
            ├─ Agent Profile Plugin
            ├─ Agent Event Plugin
            ├─ UI Panel Plugin
            ├─ Action Plugin
            ├─ Notification Plugin
            ├─ Connection Plugin
            └─ Policy / Guard Plugin
```

---

## 6. 双轨能力模型

OpenBrige 采用双轨模型：

```text
基础模式：PTY + 文件系统 + Git + 进程监督
增强模式：Agent 插件 / UI 插件 / 通知插件 / 连接插件
```

基础模式不依赖任何厂商：

1. 托管进程。
2. 捕获终端输出。
3. 发送输入。
4. 监听文件变化。
5. 计算 Git diff。
6. 记录 timeline。
7. 生成 Smart Cards。
8. 提供移动端 UI。

增强模式通过插件获得更好体验：

1. 更准确的 Agent 状态。
2. 更准确的等待输入识别。
3. 更好的 UI 面板。
4. 更丰富的通知渠道。
5. 更方便的连接方式。
6. 更贴合不同 Agent 的快捷操作。

---

## 7. 实时进度数据源

OpenBrige 要实时知道 Agent 的进度、对话、改动，不能依赖单一来源。应融合六类数据。

### 7.1 PTY Stream

OpenBrige 通过 PTY 托管 Agent 进程，实时捕获：

```text
stdout
stderr
stdin
terminal resize
exit code
process status
```

用途：

1. 展示 Agent 对话。
2. 展示命令输出。
3. 识别等待输入。
4. 识别错误。
5. 识别测试结果。
6. 将手机输入写回 Agent。

### 7.2 Workspace Watcher

监听工作区：

```text
created
modified
deleted
renamed
large file change
binary file change
sensitive file touched
```

用途：

1. 实时知道 Agent 改了哪些文件。
2. 触发 diff 更新。
3. 触发 Smart Cards。
4. 发现异常大文件或敏感文件变化。

### 7.3 Git Diff Engine

通过 Git 计算：

```text
changed files
insertions
deletions
diff hunks
renamed files
untracked files
staged / unstaged
branch
HEAD
worktree status
```

用途：

1. Diff Studio。
2. 任务完成摘要。
3. Commit message 生成输入。
4. PR description 生成输入。
5. Worktree 合并前检查。

### 7.4 Output Classifier

把终端输出转成结构化状态：

```text
waiting_input
thinking
running_command
test_started
test_failed
test_passed
build_failed
file_edited
question_detected
confirmation_prompt
task_done
error_detected
```

输出 Smart Cards：

```text
Agent 正在等待确认
测试失败
文件已修改
任务完成
出现错误
建议查看 diff
```

### 7.5 Plugin Events

插件可以发送结构化事件：

```json
{
  "version": "1.0",
  "session_id": "ses_123",
  "type": "agent.phase.changed",
  "phase": "testing",
  "message": "Running auth tests"
}
```

用途：

1. 更准确地展示进度。
2. 更准确地展示 Agent 当前阶段。
3. 扩展 UI 面板。
4. 增强会话回放。

### 7.6 Task State Machine

OpenBrige 自己维护 Session 状态：

```ts
type SessionStatus =
  | "starting"
  | "thinking"
  | "running"
  | "editing"
  | "testing"
  | "waiting_input"
  | "needs_attention"
  | "paused"
  | "completed"
  | "failed"
  | "aborted";
```

状态来源：

```text
PTY 输出
文件变化
Git diff
进程状态
测试输出
插件事件
用户操作
```

---

## 8. 核心产品对象：Session

OpenBrige 的核心对象是 Session，不是 Agent。

```ts
interface BridgeSession {
  id: string;
  title: string;
  command: string;
  cwd: string;
  status:
    | "starting"
    | "thinking"
    | "running"
    | "editing"
    | "testing"
    | "waiting_input"
    | "needs_attention"
    | "paused"
    | "completed"
    | "failed"
    | "aborted";

  transport: "pty";
  workspaceMode: "current" | "worktree" | "temporary-copy";
  createdAt: string;
  updatedAt: string;

  git?: {
    branch: string;
    head: string;
    dirty: boolean;
    filesChanged: number;
    insertions: number;
    deletions: number;
  };

  uiHints?: {
    agentName?: string;
    agentIcon?: string;
    detectedPrompt?: string;
    lastQuestion?: string;
    suggestedActions?: QuickAction[];
  };
}
```

Agent 只是这个 Session 运行的命令。

---

## 9. Agent Profile 系统

OpenBrige 不需要先做深度 Agent Adapter。首版使用 Agent Profile。

示例：

```yaml
id: claude-code
name: Claude Code
command: claude
args: []
cwd: "."
icon: claude

startup:
  wait_for_patterns:
    - ">"
    - "What would you like"

ui:
  color: purple

patterns:
  waiting_input:
    - "Do you want to"
    - "Continue?"
    - "(y/n)"
  test_failed:
    - "test failed"
    - "Tests failed"
  task_done:
    - "Done"
    - "Task complete"

quick_actions:
  summarize:
    label: 总结当前进展
    text: "Summarize current progress, changed files, test status, and next step."
  run_tests:
    label: 运行相关测试
    text: "Run the relevant tests and explain any failures."
  stop_editing:
    label: 停止修改，只总结
    text: "Stop modifying files. Only summarize from now on."
```

默认内置 profiles：

```text
claude-code
opencode
codex
gemini-cli
aider
generic-shell
custom-agent
```

社区可以贡献更多 profiles。

---

## 10. 网页端体验目标

OpenBrige 的网页端不是远程终端，而是 Agent Workspace Web OS。

### 10.1 首页：Agent Inbox

```text
需要你处理
────────────────
Claude Code 等待确认
OpenCode 测试失败，已暂停
Codex 完成任务，等待查看 Diff

运行中
────────────────
修复登录回调 bug
重构 billing module

已完成
────────────────
新增 API 测试
修复 README 示例
```

任务卡片字段：

```text
Agent
项目
状态
最近动作
改动文件数
测试状态
是否在 sandbox
是否需要输入
最近更新时间
```

### 10.2 Session 页面

桌面 Web 三栏布局：

```text
左侧：Session / Project / Agent 列表
中间：Timeline
右侧：Context Panel / Diff / Actions / Files
```

手机 Web 单栏布局：

```text
顶部：状态栏
中间：Timeline cards
底部：Action Pad + 输入框
```

### 10.3 Timeline Cards

Timeline 不应只显示聊天文本，应包含多种卡片：

```text
User Prompt Card
Agent Message Card
Terminal Output Card
File Change Card
Diff Summary Card
Test Result Card
Question Card
Error Card
Checkpoint Card
Action Card
Completion Card
```

示例：

```text
10:04 文件修改
修改 3 个文件，+221 / -64
[查看 Diff]

10:05 测试失败
pnpm test auth failed
失败 2 个用例
[查看输出] [让 Agent 解释] [重新运行]

10:07 等待输入
Agent 询问是否继续重构 session 模块
[同意] [拒绝] [补充说明]
```

### 10.4 Diff Studio

移动端 diff 必须专门设计：

```text
先看摘要
再看文件列表
再看关键 hunk
最后才展开完整 diff
```

结构：

```text
变更摘要
- 修改 5 个文件
- +312 / -87
- 新增 3 个测试
- 未触碰 .env / infra / payment

文件分组
- 业务逻辑
- 测试
- 配置
- 文档

每个文件
- 变更原因摘要
- 关键 hunk
- 展开完整 diff
```

### 10.5 Action Pad

用户不应在手机上打很多字。Action Pad 提供上下文动作：

运行中：

```text
[暂停到当前步骤后]
[让 Agent 总结当前进展]
[只查看，不再修改]
[运行测试]
[查看 Diff]
```

测试失败时：

```text
[解释失败原因]
[只修测试]
[回滚最后一次改动]
[停止并总结]
```

任务完成时：

```text
[生成 commit message]
[生成 PR description]
[导出 patch]
[合并 sandbox]
[删除 sandbox]
```

这些按钮可以向 PTY 发送文本，也可以执行 OpenBrige 自己控制的安全动作。

---

## 11. Smart Cards

Smart Card 是顶级网页体验的核心。

```ts
interface SmartCard {
  id: string;
  sessionId: string;
  kind:
    | "question"
    | "test_result"
    | "file_change"
    | "diff_summary"
    | "error"
    | "command"
    | "completion"
    | "warning"
    | "checkpoint";
  title: string;
  summary: string;
  severity: "info" | "success" | "warning" | "error";
  actions: CardAction[];
  createdAt: string;
}
```

示例：

```json
{
  "kind": "test_result",
  "title": "测试失败",
  "summary": "pnpm test auth 失败：2 个用例未通过",
  "severity": "error",
  "actions": [
    { "label": "查看输出", "type": "open_output" },
    {
      "label": "让 Agent 解释",
      "type": "send_prompt",
      "text": "Explain the failing tests and propose a fix. Do not edit files yet."
    },
    { "label": "重新运行测试", "type": "bridge_command", "command": "run_test" }
  ]
}
```

---

## 12. Worktree Sandbox

Worktree Sandbox 是 OpenBrige 的关键技术壁垒。

默认启动：

```bash
openbrige start claude-code --sandbox
```

创建：

```text
project/.openbrige/worktrees/ses_123
```

效果：

1. 主工作区不被污染。
2. 多个 Agent 可并行。
3. 失败可以直接删除。
4. 成功可以合并 patch。
5. 手机可以放心终止。
6. Diff 更清晰。
7. Session Replay 更完整。

手机端展示：

```text
当前任务运行在隔离工作区
主工作区未被修改

可操作：
[查看 diff]
[合并到当前分支]
[生成 patch]
[删除 sandbox]
```

---

## 13. 插件体系

OpenBrige 插件是增强层，不是核心依赖。

### 13.1 Profile Plugin

零代码 YAML 插件。用于描述 Agent 的启动命令、UI 元信息、输出模式、快捷操作。

目录：

```text
~/.openbrige/plugins/profiles/
.openbrige/plugins/profiles/
```

### 13.2 Agent Event Plugin

插件通过 stdio / local socket / HTTP 向 OpenBrige 发送结构化事件。

事件类型：

```text
agent.phase.changed
message.created
message.delta
tool.started
tool.completed
tool.failed
file.read
file.edited
command.started
command.completed
question.asked
task.completed
task.failed
```

### 13.3 UI Panel Plugin

扩展网页端面板。默认只读，运行在 iframe 或 Web Worker 中。

示例：

```text
diff-viewer
test-report
terraform-plan
kubernetes-diff
docker-build
github-pr
dependency-risk
coverage-report
storybook-preview
```

Manifest：

```json
{
  "id": "terraform-plan-panel",
  "name": "Terraform Plan",
  "type": "ui-panel",
  "entry": "panel.js",
  "permissions": [
    "session:read",
    "files:read:terraform-plan"
  ],
  "placement": [
    "session.detail",
    "diff.studio"
  ]
}
```

### 13.4 Action Plugin

扩展快捷操作。

示例：

```text
生成 commit message
生成 PR description
运行测试
生成 patch
合并 worktree
打开本地预览
运行 npm script
```

### 13.5 Notification Plugin

支持：

```text
PWA foreground
ntfy
Gotify
Bark
Telegram Bot
Slack
Discord
Email
Webhook
Native Companion
```

### 13.6 Connection Plugin

支持：

```text
LAN Direct
FRP
WireGuard
Headscale
SSH Reverse Tunnel
Cloudflare Tunnel
ngrok
Custom Gateway
```

接口：

```ts
interface ConnectionProvider {
  id: string;
  detect(): Promise<ConnectionCapability>;
  start(config: ConnectionConfig): Promise<ConnectionEndpoint>;
  stop(): Promise<void>;
  doctor(): Promise<DiagnosticResult>;
}
```

### 13.7 Policy / Guard Plugin

控制 OpenBrige 自己的动作，而不是强行控制 Agent 内部动作。

可控制：

```text
worktree 合并
patch 导出
git commit
git push
运行脚本
打开 tunnel
读取敏感文件摘要
```

---

## 14. 本地事件总线

Host Server 内部所有模块写入 Event Bus。

```ts
type BridgeEvent =
  | { type: "session.created"; session: BridgeSession }
  | { type: "pty.output"; sessionId: string; data: string }
  | { type: "user.input"; sessionId: string; text: string }
  | { type: "workspace.file.changed"; sessionId: string; path: string }
  | { type: "git.diff.updated"; sessionId: string; summary: DiffSummary }
  | { type: "classifier.card.created"; sessionId: string; card: SmartCard }
  | { type: "plugin.event"; sessionId: string; payload: unknown }
  | { type: "session.status.changed"; sessionId: string; status: SessionStatus };
```

用途：

1. 实时推送。
2. 断线恢复。
3. 会话回放。
4. 审计。
5. 调试。
6. 导出。

---

## 15. 本地 Event Store

使用 SQLite。

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  command TEXT NOT NULL,
  cwd TEXT NOT NULL,
  status TEXT NOT NULL,
  workspace_mode TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE files (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  change_type TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE smart_cards (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE connections (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  mode TEXT NOT NULL,
  endpoint TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 16. WebSocket 实时同步

前端订阅：

```text
/ws?session_id=ses_123&cursor=456
```

机制：

1. 每个事件有递增 seq。
2. 手机断线后带 cursor 重连。
3. Host 补发漏掉的事件。
4. 大量终端输出需要批处理。
5. 保留完整 Event Store。
6. UI 可以丢弃中间视觉帧，但不能丢事件记录。

---

## 17. 性能要求

网页端要做到顶级，必须有硬指标。

### 17.1 首屏

```text
手机首页首屏 < 1s
会话页打开 < 1s
实时输出 LAN 延迟 < 200ms
Diff 摘要 < 500ms
大量日志不卡顿
```

### 17.2 终端输出虚拟化

要求：

```text
virtual list
chunked output
fold long logs
search index
sticky latest output
server-side batching
client ack cursor
```

### 17.3 Diff 增量计算

要求：

```text
debounce
per-file diff cache
large file threshold
binary file skip
summary first
lazy load full diff
```

### 17.4 WebSocket 背压

要求：

```text
server-side batching
client ack cursor
drop visual-only intermediate frames
preserve event store
compress output chunks
```

---

## 18. 连接层

OpenBrige 默认电脑作为服务器。

### 18.1 LAN Direct

同一局域网访问：

```text
https://openbrige.local:7443
https://192.168.1.23:7443
```

### 18.2 Self-host FRP

用户自己的 VPS 运行 frps，电脑运行 frpc。

```text
手机 -> 用户 VPS -> 电脑 Host Server
```

### 18.3 WireGuard / Headscale

手机和电脑加入用户自己的私有网络。

```text
手机 -> 私有 VPN IP -> 电脑 Host Server
```

### 18.4 SSH Reverse Tunnel

电脑主动连接用户自己的服务器，暴露本地 Host Server。

### 18.5 Managed Tunnel

可选，不作为开源核心依赖。

---

## 19. Connection Doctor

命令：

```bash
openbrige doctor connect
```

输出示例：

```text
OpenBrige Network Doctor
────────────────────────
✓ Host Server running on 0.0.0.0:7443
✓ Local IP: 192.168.1.23
✓ mDNS name: openbrige.local
✓ Firewall allows port 7443
△ HTTPS certificate is local CA
✗ Public access not configured
✗ FRP not configured
✓ Cloud relay disabled

Phone connection:
  Use same Wi-Fi and scan:
  https://192.168.1.23:7443
```

手机端也要提供连接诊断：

1. DNS 解析测试。
2. HTTPS 证书状态。
3. WebSocket 连接测试。
4. API ping。
5. mDNS fallback。
6. 局域网 IP fallback。
7. 隧道状态。

---

## 20. 安全边界

因为 OpenBrige 默认把 Agent 当黑盒进程，所以安全边界必须诚实。

OpenBrige 不承诺：

```text
不读取 Agent 内部 tool call。
不保证知道 Agent 想执行的每个内部动作。
不替代 Agent 原生权限系统。
不伪装成任何 Agent 的官方移动端。
```

OpenBrige 承诺：

```text
控制会话输入输出。
观察文件变化。
观察 Git diff。
记录 timeline。
隔离工作区。
控制 OpenBrige 自己的交付动作。
保护本机服务器访问。
保护已配对设备。
```

正确的产品边界：

```text
Agent 负责写代码。
OpenBrige 负责会话、观察、展示、连接、隔离和交付。
```

---

## 21. 本机服务器安全

要求：

1. 配对 token 5 分钟过期。
2. 配对 token 一次性使用。
3. 未配对设备只能访问 `/pair`。
4. 所有 API 需要设备 token。
5. WebSocket 需要认证。
6. CORS 默认关闭。
7. Origin 校验。
8. Rate limit。
9. IP allowlist 可选。
10. 公网模式必须显式开启。
11. 管理 API 不暴露给未配对设备。
12. 敏感路径默认不在 UI 中展示内容。
13. Worktree 合并、git push 等 OpenBrige 动作需要确认。

---

## 22. 开源仓库结构

```text
openbrige/
  apps/
    web/
      # Mobile / Desktop PWA
    host/
      # Local Host Server

  packages/
    cli/
    pty-supervisor/
    session-recorder/
    workspace-watcher/
    git-diff-engine/
    output-classifier/
    smart-cards/
    worktree-manager/
    connection-manager/
    notification-router/
    plugin-runtime/
    local-store/
    network-doctor/
    shared-types/

  plugins/
    profiles/
      claude-code/
      opencode/
      codex/
      gemini-cli/
      aider/
      generic-shell/

    panels/
      diff-studio/
      test-report/
      terminal/
      files/
      replay/

    notifications/
      ntfy/
      gotify/
      bark/
      telegram/
      webhook/

    connections/
      lan-direct/
      frp/
      wireguard/
      headscale/
      ssh-reverse-tunnel/

  examples/
    custom-profile/
    custom-panel/
    custom-notification/
    custom-connection/

  docs/
    quickstart.md
    architecture.md
    plugin-system.md
    profile-plugin.md
    ui-panel-plugin.md
    connection.md
    worktree-sandbox.md
    security.md
    contributing.md
    roadmap.md

  README.md
  LICENSE
  .github/
    SECURITY.md
    CONTRIBUTING.md
    GOVERNANCE.md
```

---

## 23. 推荐技术栈

### 23.1 Host

```text
TypeScript
Node.js 或 Bun
Fastify / Hono
WebSocket
node-pty / portable-pty
SQLite
chokidar
simple-git 或原生 git CLI
zod
```

### 23.2 Web

```text
React
Vite 或 Next.js
TypeScript
Tailwind CSS
TanStack Query
Zustand
IndexedDB
WebSocket Client
Virtualized List
Monaco Diff 可选
CodeMirror 可选
```

### 23.3 插件

```text
YAML profiles
JSON manifest
iframe sandbox
Web Worker
local package registry
signature / checksum later
```

---

## 24. CLI 设计

```bash
openbrige init
openbrige start
openbrige start claude-code --sandbox
openbrige start opencode --sandbox
openbrige session list
openbrige session open <id>
openbrige doctor connect
openbrige plugin list
openbrige plugin install <path>
openbrige profile list
openbrige tunnel frp init
openbrige tunnel wireguard doctor
openbrige update
```

启动输出：

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

---

## 25. MVP 范围

第一阶段目标：做出一个足够惊艳的本地 Agent 手机控制台。

MVP 必须有：

```text
1. Host Server
2. Mobile / Web PWA
3. PTY Session Supervisor
4. Agent Profile 系统
5. Workspace Watcher
6. Git Diff Engine
7. Timeline Recorder
8. Smart Cards
9. Action Pad
10. Worktree Sandbox
11. LAN Direct + QR Pairing
12. Connection Doctor
13. Plugin Runtime v0
14. Notification Provider v0
```

MVP 内置 profiles：

```text
claude-code
opencode
codex
aider
gemini-cli
generic-shell
```

MVP 内置 panels：

```text
Terminal
Timeline
Files
Diff Studio
Test Report
Replay
```

MVP 内置 notifications：

```text
PWA foreground
Webhook
ntfy
Gotify
```

---

## 26. 首发 Demo

首发 Demo 必须 5 分钟内惊艳。

流程：

```text
1. 电脑运行 openbrige init。
2. 手机扫码连接。
3. 选择 Claude Code profile。
4. 启动 sandbox session。
5. 手机看到实时 timeline。
6. Agent 修改代码。
7. 手机收到文件变化卡片。
8. Agent 跑测试失败。
9. 手机收到测试失败卡片。
10. 手机点“让 Agent 解释失败”。
11. Agent 修复完成。
12. 手机看 Diff Studio。
13. 手机点“生成 commit message”。
14. 手机点“合并回主工作区”。
15. Session Replay 展示完整过程。
```

Demo 传播语：

```text
Turn any local AI coding agent into a mobile-controlled workspace.
```

中文：

```text
把任意本地 AI 编程 Agent 变成手机可控的工作台。
```

---

## 27. Roadmap

### v0.1 Alpha

```text
Host Server
Mobile PWA
PTY Supervisor
Agent Profiles
LAN Direct
QR Pairing
Timeline
Terminal Stream
Workspace Watcher
Git Diff Summary
Action Pad
Worktree Sandbox
```

### v0.2 Beta

```text
Smart Cards
Diff Studio
Session Replay
Connection Doctor
ntfy / Gotify
Plugin Runtime v0
Profile Marketplace from Git
FRP Provider
WireGuard Docs
```

### v0.3 Public Launch

```text
UI Panel Plugin
Action Plugin
Connection Plugin
More profiles
Security hardening
Performance optimization
Mobile polish
Open-source docs
Demo video
```

### v1.0 Stable

```text
Stable plugin API
Stable event model
Stable session replay format
Native companion optional
Signed plugins
Policy / Guard plugins
Self-host connection recipes
Community registry
```

---

## 28. 开源许可证建议

推荐：

```text
核心 Host / Web / Runtime：AGPL-3.0-or-later
插件 SDK / Types / Examples：Apache-2.0
文档：CC-BY-4.0 或 Apache-2.0
```

原因：

1. Host Server 是核心运行时，AGPL 可以避免被直接闭源套壳成远程服务。
2. 插件 SDK 要足够开放，Apache-2.0 更利于生态扩展。
3. Profiles 和示例应宽松，方便社区贡献。
4. 开源版必须完整可用。

---

## 29. 成功标准

开源启动期成功标准：

```text
1. 5 分钟内完成本机启动和手机连接。
2. 任意 CLI Agent 可以被托管。
3. 手机端实时看到对话、进度和文件变化。
4. Diff Studio 比手机终端体验明显更好。
5. Worktree Sandbox 让用户敢于放手让 Agent 跑。
6. 社区可以贡献 Agent Profile。
7. Connection Doctor 能解决大部分连接失败问题。
8. Demo 足够适合传播。
9. 不需要任何厂商接入也能好用。
10. 厂商接入插件后体验更强。
```

---

## 30. 最终判断

OpenBrige 最强的路线不是做某个 Agent 的插件，而是做一个 Local-first 的 Agent Session Bridge。

它应当做到：

```text
任何 Agent 都能用。
没有插件也好用。
有插件会更强。
网页端体验做到顶。
电脑是服务器。
手机是控制台。
数据默认在本机。
```

一句话定位：

```text
OpenBrige is a local-first web control plane for any AI coding agent.
```

中文定位：

```text
OpenBrige 是面向任意本地 AI 编程 Agent 的 Local-first Web 控制台。
```

最终产品哲学：

```text
Agent 是黑盒，OpenBrige 是驾驶舱。
```
