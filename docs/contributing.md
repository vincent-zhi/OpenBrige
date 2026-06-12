# Contributing to OpenBrige

Thank you for your interest in contributing to OpenBrige! This guide will help you get started.

## Development Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Build all packages: `pnpm -r build`
4. Start development server: `pnpm --filter @openbrige/cli dev`

## Project Structure

- `apps/host/` - Local Host Server (Hono + WebSocket)
- `apps/web/` - Web PWA (React + Vite + Tailwind)
- `packages/` - Shared packages (PTY supervisor, store, etc.)
- `plugins/` - Built-in plugins (profiles, panels, notifications, connections)
- `examples/` - Example plugins

## How to Contribute

### Report Bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- OS and Node.js version

### Submit Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pnpm -r test`
5. Run linting: `pnpm -r lint`
6. Commit with conventional commits
7. Open a Pull Request

### Contribute an Agent Profile

Create a YAML file in `plugins/profiles/your-agent/`:

```yaml
id: your-agent
name: Your Agent
command: your-agent-command
args: []
ui:
  color: "#color"
patterns:
  waiting_input:
    - "pattern1"
  task_done:
    - "pattern2"
quick_actions:
  - id: summarize
    label: Summarize
    text: "Summarize current progress"
```

### Contribute a Plugin

See [Plugin System](./plugin-system.md) and [UI Panel Plugin](./ui-panel-plugin.md) for details.

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- 2-space indentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (AGPL-3.0-or-later for core, Apache-2.0 for plugins/examples).
