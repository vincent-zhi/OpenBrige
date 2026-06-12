# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OpenBrige, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

### How to Report

1. Email: [security@openbrige.dev] (TODO: set up email)
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- Acknowledgment within 48 hours
- Status update within 7 days
- Fix timeline depends on severity

## Security Boundaries

OpenBrige has a clearly defined security model. Understanding these boundaries is important:

### OpenBrige Controls

- Session input/output (PTY stdin/stdout)
- File system observation (read-only monitoring)
- Git diff computation (read-only)
- Timeline recording
- Worktree isolation
- OpenBrige's own delivery actions (merge, push, export)
- Local server access control
- Device pairing and authentication

### OpenBrige Does NOT Control

- Agent's internal tool calls or reasoning
- Agent's native permission system
- What the agent writes to files (OpenBrige observes, doesn't gate)
- Agent process sandboxing

### Implications

- The agent process runs with the same permissions as the user who started OpenBrige
- OpenBrige does not sandbox the agent — use Worktree Sandbox for isolation
- OpenBrige does not perform code review or static analysis on agent output
- Review diffs carefully before merging worktree sandboxes

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x (Alpha) | Yes |
| < 0.1 | No |

## Best Practices

See [Security Docs](./docs/security.md) for detailed security guidance including network security, session security, and device security.
