# Connection Methods

OpenBrige runs as a local server on your computer. By default, it's accessible on your local network. For remote access, several connection methods are supported.

## LAN Direct

The default and simplest method. Works when your phone and computer are on the same Wi-Fi network.

### How It Works

1. OpenBrige binds to `0.0.0.0:7443`
2. It announces itself via mDNS as `openbrige.local`
3. Devices on the same network can connect via IP or mDNS name

### Access URLs

```text
https://localhost:7443           # Same computer
https://openbrige.local:7443    # mDNS (same network)
https://192.168.1.23:7443       # Direct IP (same network)
```

### QR Code Pairing

When you start OpenBrige, it prints a QR code in the terminal. Scan it with your phone to connect instantly.

```text
Open on your phone:
  https://192.168.1.23:7443

Scan QR:
[ QR Code ]
```

### Firewall

If you can't connect, check your firewall settings:

```bash
# macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setblockall off

# Linux (ufw)
sudo ufw allow 7443

# Windows
# Allow port 7443 in Windows Defender Firewall
```

### Connection Doctor

Run the built-in diagnostic tool:

```bash
openbrige doctor connect
```

Output:

```text
OpenBrige Network Doctor
────────────────────────
✓ Host Server running on 0.0.0.0:7443
✓ Local IP: 192.168.1.23
✓ mDNS name: openbrige.local
✓ Firewall allows port 7443
△ HTTPS certificate is local CA
✗ Public access not configured
✓ Cloud relay disabled

Phone connection:
  Use same Wi-Fi and scan:
  https://192.168.1.23:7443
```

## FRP (Fast Reverse Proxy)

For accessing your computer from outside the local network using a self-hosted reverse proxy.

> Status: Placeholder — implementation in progress

### Overview

```text
Phone → Your VPS (frps) → Your Computer (frpc) → OpenBrige Host
```

You run `frps` on a VPS you control, and `frpc` on your computer. OpenBrige will manage the `frpc` configuration.

### Setup (Planned)

```bash
# Initialize FRP configuration
openbrige tunnel frp init

# Start the tunnel
openbrige tunnel frp start

# Check status
openbrige tunnel frp status
```

### Configuration (Planned)

```yaml
# .openbrige/tunnels/frp.yml
server:
  host: your-vps.example.com
  port: 7000
  token: your-secret-token

local:
  port: 7443
  protocol: https
```

## WireGuard / Headscale

For a persistent VPN connection between your devices.

> Status: Placeholder — documentation in progress

### Overview

```text
Phone (WireGuard) → Private VPN → Computer (WireGuard) → OpenBrige Host
```

Both devices join a WireGuard network. Once connected, they can reach each other directly.

### Setup (Planned)

```bash
# Generate WireGuard configuration
openbrige tunnel wireguard init

# Check connectivity
openbrige tunnel wireguard doctor
```

### Headscale Integration (Planned)

For teams, Headscale provides a self-hosted coordination server for WireGuard:

```bash
openbrige tunnel wireguard init --headscale your-headscale.example.com
```

## SSH Tunnel

For accessing your computer via an SSH reverse tunnel through a server you control.

> Status: Placeholder — implementation in progress

### Overview

```text
Phone → Your Server (sshd) ← Your Computer (SSH client) → OpenBrige Host
```

Your computer initiates an SSH connection to your server, creating a reverse tunnel. External devices connect through the server.

### Setup (Planned)

```bash
# Configure SSH tunnel
openbrige tunnel ssh init

# Start tunnel
openbrige tunnel ssh start

# Stop tunnel
openbrige tunnel ssh stop
```

### Configuration (Planned)

```yaml
# .openbrige/tunnels/ssh.yml
server:
  host: your-server.example.com
  user: openbrige
  port: 22
  key: ~/.ssh/openbrige_tunnel

tunnel:
  remote_port: 7443
  local_port: 7443
```

## Connection Priority

When multiple connection methods are available, OpenBrige uses this priority:

1. **LAN Direct** — Fastest, no external dependencies
2. **WireGuard** — Persistent, encrypted, direct
3. **SSH Tunnel** — Works with any SSH server
4. **FRP** — Flexible, requires a VPS

The Connection Doctor recommends the best option for your setup.
