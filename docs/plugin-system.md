# Plugin System

OpenBrige uses a dual-track model: a solid base layer (PTY + filesystem + git) works without any plugins, and plugins add enhanced capabilities on top.

## Plugin Types

| Type | Description | Format |
|------|-------------|--------|
| **Profile** | Agent definitions — command, patterns, quick actions | YAML (zero-code) |
| **UI Panel** | Custom panels rendered in the session view | JS + HTML (iframe/Web Worker) |
| **Action** | Custom operations for the Action Pad | JS |
| **Notification** | Push notification providers | JS |
| **Connection** | Network connection providers | JS |
| **Policy/Guard** | Controls OpenBrige's own actions | JS |

## Directory Structure

```text
plugins/
  profiles/
    claude-code/
      profile.yml
    opencode/
      profile.yml
    codex/
      profile.yml
    gemini-cli/
      profile.yml
    aider/
      profile.yml
    generic-shell/
      profile.yml

  panels/
    diff-studio/
      manifest.json
      panel.js
      panel.html
    test-report/
      manifest.json
      panel.js

  notifications/
    ntfy/
      manifest.json
      provider.js
    gotify/
      manifest.json
      provider.js

  connections/
    lan-direct/
      manifest.json
      provider.js
    frp/
      manifest.json
      provider.js
```

## Manifest Format

Every plugin (except Profile plugins) requires a `manifest.json`:

```json
{
  "id": "terraform-plan-panel",
  "name": "Terraform Plan",
  "version": "1.0.0",
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

### Manifest Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique plugin identifier |
| `name` | string | Yes | Display name |
| `version` | string | Yes | Semver version |
| `type` | string | Yes | Plugin type (`ui-panel`, `action`, `notification`, `connection`, `policy`) |
| `entry` | string | Yes | Entry point file |
| `permissions` | string[] | No | Required permissions |
| `placement` | string[] | No | Where UI panels appear |
| `config` | object | No | Default configuration schema |

### Permission Strings

| Permission | Scope |
|------------|-------|
| `session:read` | Read session state and events |
| `session:write` | Send input to sessions |
| `files:read:<pattern>` | Read files matching glob pattern |
| `files:write:<pattern>` | Write files matching pattern |
| `git:read` | Read git state and diffs |
| `git:write` | Perform git operations |
| `network:access` | Make outbound network requests |

## Development Guide

### Creating a Profile Plugin

The simplest plugin type. See [Profile Plugin Guide](./profile-plugin.md).

### Creating a UI Panel Plugin

1. Create a directory:

   ```bash
   mkdir -p plugins/panels/my-panel
   ```

2. Create `manifest.json`:

   ```json
   {
     "id": "my-panel",
     "name": "My Panel",
     "version": "0.1.0",
     "type": "ui-panel",
     "entry": "panel.js",
     "permissions": ["session:read"],
     "placement": ["session.detail"]
   }
   ```

3. Create `panel.js`:

   ```javascript
   export default {
     async mount(container, context) {
       const { sessionId, subscribe } = context;

       container.innerHTML = `<div id="content">Loading...</div>`;

       subscribe("session.status.changed", (event) => {
         container.querySelector("#content").textContent =
           `Status: ${event.status}`;
       });
     },

     async unmount(container) {
       container.innerHTML = "";
     }
   };
   ```

4. Install the plugin:

   ```bash
   openbrige plugin install ./plugins/panels/my-panel
   ```

### Creating a Notification Plugin

```javascript
// plugins/notifications/my-provider/manifest.json
{
  "id": "my-notifier",
  "name": "My Notifier",
  "version": "0.1.0",
  "type": "notification",
  "entry": "provider.js",
  "config": {
    "webhook_url": {
      "type": "string",
      "required": true,
      "description": "Webhook URL for notifications"
    }
  }
}

// plugins/notifications/my-provider/provider.js
export default {
  async init(config) {
    this.webhookUrl = config.webhook_url;
  },

  async send(card, session) {
    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: card.title,
        message: card.summary,
        severity: card.severity,
        session: session.title
      })
    });
  }
};
```

### Creating a Connection Plugin

```typescript
// plugins/connections/my-tunnel/manifest.json
{
  "id": "my-tunnel",
  "name": "My Tunnel",
  "version": "0.1.0",
  "type": "connection",
  "entry": "provider.js"
}

// plugins/connections/my-tunnel/provider.js
export default {
  id: "my-tunnel",

  async detect() {
    // Return connection capability info
    return { available: true, requiresSetup: true };
  },

  async start(config) {
    // Start the tunnel
    return { endpoint: "https://..." };
  },

  async stop() {
    // Stop the tunnel
  },

  async doctor() {
    // Run diagnostics
    return { healthy: true, details: {} };
  }
};
```

### Plugin Lifecycle

```text
Discovery → Validation → Loading → Initialization → Runtime → Cleanup
```

1. **Discovery** — Plugin runtime scans plugin directories for `manifest.json` files
2. **Validation** — Manifest is validated against the schema; permissions are checked
3. **Loading** — Entry file is loaded in the appropriate sandbox (iframe, Web Worker, or main thread)
4. **Initialization** — Plugin `init()` is called with configuration
5. **Runtime** — Plugin receives events, renders UI, or handles actions
6. **Cleanup** — Plugin `unmount()` or `dispose()` is called on session end or plugin deactivation

### Sandbox Security

- UI panels run in iframes with restricted permissions
- Notification and connection plugins run in Web Workers
- Policy plugins run in the main thread with explicit permission checks
- All plugin network access goes through the connection manager
- Plugins cannot access the filesystem outside their declared permissions
