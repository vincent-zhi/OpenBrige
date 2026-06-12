# Contributing

Thanks for your interest in contributing to OpenBrige!

## Development Setup

```bash
git clone https://github.com/nicepkg/openbrige.git
cd openbrige
pnpm install
pnpm dev
```

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git

### Project Structure

```text
apps/
  web/          # Mobile/Desktop PWA (React + Vite)
  host/         # Local Host Server (Fastify + WebSocket)
packages/       # Shared packages
plugins/        # Built-in plugins (profiles, panels, etc.)
```

### Useful Commands

```bash
pnpm dev          # Start all apps in parallel
pnpm dev:host     # Start host server only
pnpm dev:web      # Start web UI only
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm lint         # Lint all packages
pnpm typecheck    # Type-check all packages
```

## Code Style

- TypeScript throughout
- Prettier for formatting (run `pnpm format`)
- ESLint for linting (run `pnpm lint`)
- No comments unless necessary
- Prefer explicit types over `any`
- Keep functions small and focused

## Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run `pnpm lint` and `pnpm typecheck`
5. Run `pnpm test` to ensure tests pass
6. Write a clear PR description explaining the what and why
7. Submit the PR

### PR Guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new functionality
- Update documentation if behavior changes
- Follow existing code conventions
- Keep commits clean and descriptive

## Plugin Contributions

### Agent Profiles

The easiest way to contribute. Create a YAML profile:

1. Fork the repository
2. Add your profile in `plugins/profiles/<agent-name>/profile.yml`
3. Follow the [Profile Plugin Guide](./docs/profile-plugin.md)
4. Submit a PR

### UI Panels, Notifications, Connections

1. Fork the repository
2. Add your plugin in the appropriate `plugins/` subdirectory
3. Include a `manifest.json` following the [Plugin System Docs](./docs/plugin-system.md)
4. Include tests
5. Submit a PR

### Plugin Guidelines

- Plugins should be self-contained
- Include a clear `manifest.json` with proper permissions
- Document configuration options
- Test on multiple platforms if possible
- Follow the principle: "No plugin should be required for basic functionality"

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps
- Include environment info (OS, Node version, pnpm version)
- Include relevant logs from `openbrige doctor connect`

## License

By contributing, you agree that your contributions will be licensed under the project's licenses:

- Core (Host, Web, Runtime): AGPL-3.0-or-later
- Plugins, SDK, Types, Examples: Apache-2.0
