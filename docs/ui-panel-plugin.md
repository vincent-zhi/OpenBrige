# UI Panel Plugin

UI Panel plugins extend the OpenBrige web interface with custom panels displayed in the session detail view.

## How It Works

UI panels are loaded in sandboxed iframes within the OpenBrige web UI. They communicate with the host application via `postMessage`.

## Plugin Manifest

```json
{
  "id": "my-panel",
  "name": "My Panel",
  "version": "1.0.0",
  "type": "ui-panel",
  "entry": "index.html",
  "permissions": ["read:events", "read:diff"],
  "placement": ["session-detail"]
}
```

## Communication Protocol

### Panel → Host

```js
// Notify host that panel is ready
parent.postMessage({ type: 'openbrige-ready' }, '*');

// Request API data
parent.postMessage({
  type: 'openbrige-api',
  requestId: 'unique-id',
  path: '/sessions/123/events',
  method: 'GET'
}, '*');
```

### Host → Panel

```js
// API response
window.addEventListener('message', (e) => {
  if (e.data.type === 'openbrige-api-response') {
    console.log(e.data.requestId, e.data.data);
  }
});
```

## Permissions

- `read:events` - Read session events
- `read:diff` - Read git diff data
- `read:files` - Read file change data
- `read:cards` - Read smart cards

## Placement

- `session-detail` - Shown in the session detail right panel
