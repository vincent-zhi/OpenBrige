# Roadmap

## v0.1 Alpha

Core functionality — get a working local agent control plane.

- [ ] Host Server with PTY supervision
- [ ] Mobile/Desktop PWA
- [ ] Agent Profile system (YAML)
- [ ] Workspace Watcher (file change detection)
- [ ] Git Diff Engine (basic diff computation)
- [ ] Timeline (live session view)
- [ ] Terminal Stream (real-time output)
- [ ] Action Pad (quick commands)
- [ ] Worktree Sandbox (isolated agent workspaces)
- [ ] LAN Direct connection
- [ ] QR Code pairing
- [ ] Connection Doctor (basic diagnostics)

### Built-in Profiles

- claude-code
- opencode
- codex
- gemini-cli
- aider
- generic-shell

## v0.2 Beta

Enhanced monitoring and plugin foundation.

- [ ] Smart Cards (structured notifications)
- [ ] Diff Studio (mobile-optimized diff viewer)
- [ ] Session Replay (timeline playback)
- [ ] Connection Doctor (full diagnostics)
- [ ] Notification plugins (ntfy, Gotify, Webhook)
- [ ] Plugin Runtime v0 (load and execute plugins)
- [ ] Profile marketplace (install from git repos)
- [ ] FRP connection provider
- [ ] WireGuard documentation
- [ ] Cursor-based WebSocket resync
- [ ] Output batching and backpressure

## v0.3 Public Launch

Polish, extensibility, and community readiness.

- [ ] UI Panel plugin support
- [ ] Action plugin support
- [ ] Connection plugin support
- [ ] Additional agent profiles
- [ ] Security hardening
- [ ] Performance optimization (virtual lists, lazy diff loading)
- [ ] Mobile UI polish
- [ ] Complete documentation
- [ ] Demo video
- [ ] Community contribution guidelines

## v1.0 Stable

Stable APIs and production readiness.

- [ ] Stable plugin API
- [ ] Stable event model
- [ ] Stable session replay format
- [ ] Native companion app (optional)
- [ ] Signed plugins
- [ ] Policy/Guard plugins
- [ ] Self-hosted connection recipes (FRP, WireGuard, SSH)
- [ ] Community plugin registry
- [ ] Comprehensive test coverage
- [ ] Performance benchmarks
