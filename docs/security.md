# Security

OpenBrige takes a transparent approach to security. Since agents are treated as black boxes, the security boundary is clearly defined.

## Security Model

OpenBrige controls the **session layer** — not the agent's internal logic. The boundary is:

```text
Agent writes code. OpenBrige manages sessions, observation, display, connection, isolation, and delivery.
```

### What OpenBrige Controls

- Session input/output (PTY stdin/stdout)
- File system observation (read-only monitoring)
- Git diff computation (read-only)
- Timeline recording
- Worktree isolation (creates/removes worktrees)
- OpenBrige's own delivery actions (merge, push, export)
- Local server access control
- Device pairing

### What OpenBrige Does NOT Control

- Agent's internal tool calls
- Agent's internal reasoning or decision-making
- Agent's native permission system
- What the agent writes to files (OpenBrige observes, doesn't gate)

## What OpenBrige Does

- **Device Pairing** — New devices must be approved. Pairing tokens expire after 5 minutes and are single-use.
- **Authentication** — All API endpoints require a valid device token. Unpaired devices can only access `/pair`.
- **WebSocket Auth** — WebSocket connections require authentication.
- **CORS** — Disabled by default. Must be explicitly configured.
- **Origin Checking** — Validates request origins.
- **Rate Limiting** — Applied to API endpoints.
- **HTTPS** — Local CA certificate by default for LAN access.
- **Worktree Sandbox** — Isolates agent changes from the main workspace.
- **Action Confirmation** — Destructive actions (merge, push, export) require user confirmation.
- **Sensitive Path Protection** — Sensitive file contents are not displayed in the UI by default.

## What OpenBrige Doesn't Do

- **No agent sandboxing** — OpenBrige does not sandbox the agent process itself. The agent has the same filesystem permissions as the user running OpenBrige.
- **No code review gate** — OpenBrige does not block the agent from writing malicious code. Use Worktree Sandbox to isolate changes.
- **No cloud telemetry** — No data is sent to external services unless you configure a notification or connection plugin.
- **No agent impersonation** — OpenBrige is not an official mobile app for any agent. It's an independent control plane.

## Best Practices

### Network Security

1. **Use LAN Direct for local access** — Don't expose OpenBrige to the internet unless necessary.
2. **Enable HTTPS** — Always use HTTPS, even on LAN. OpenBrige generates a local CA certificate.
3. **Use WireGuard or SSH tunnels for remote access** — Avoid port-forwarding OpenBrige directly.
4. **Configure IP allowlists** — If exposing to the internet, restrict access to known IPs.
5. **Enable public mode explicitly** — Public access is off by default and must be explicitly enabled.

```bash
# Check your network exposure
openbrige doctor connect
```

### Session Security

1. **Use Worktree Sandbox** — Always use `--sandbox` for untrusted or experimental tasks.
2. **Review diffs before merging** — Use Diff Studio to review all changes before merging worktree sandboxes.
3. **Set up Policy plugins** — Control which OpenBrige actions are allowed (merge, push, export).
4. **Monitor Smart Cards** — Pay attention to error and warning cards.

### Device Security

1. **Review paired devices** — Periodically check which devices are paired.
2. **Revoke unused devices** — Remove devices you no longer use.
3. **Use short-lived tokens** — Pairing tokens expire in 5 minutes by default.

```bash
# List paired devices
openbrige device list

# Revoke a device
openbrige device revoke <device_id>
```

### Agent Security

1. **Use agent-native permission systems** — Claude Code, Codex, and other agents have their own permission models. Use them.
2. **Don't run OpenBrige as root** — Run as a normal user with appropriate file permissions.
3. **Keep agent configurations in version control** — Track what agents can access.

## Security Boundaries

```text
┌─────────────────────────────────────────────┐
│              OpenBrige Boundary              │
│                                             │
│  ✓ Session I/O control                      │
│  ✓ File observation                         │
│  ✓ Git diff computation                     │
│  ✓ Timeline recording                       │
│  ✓ Worktree isolation                       │
│  ✓ Delivery action control                  │
│  ✓ Device authentication                    │
│                                             │
│  ✗ Agent process sandboxing                 │
│  ✗ Agent internal tool call interception    │
│  ✗ Agent permission enforcement             │
│  ✗ Code review or static analysis           │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│               Agent Boundary                │
│                                             │
│  The agent runs with the same permissions   │
│  as the user who started OpenBrige.         │
│                                             │
│  OpenBrige observes but does not gate       │
│  the agent's file operations.               │
│                                             │
└─────────────────────────────────────────────┘
```

## Vulnerability Reporting

See [SECURITY.md](../SECURITY.md) for how to report security vulnerabilities.
