# SSH Mesh + Agent Topology

Three machines, two repos, five running agent instances. Every node can `ssh` to every other node by short alias with ed25519 key auth.

Last updated: 2026-05-23.

## Agent topology

| Agent ID             | Machine | Local user | Repo                          | Channel       | tmux session    |
| -------------------- | ------- | ---------- | ----------------------------- | ------------- | --------------- |
| `mbp-sendblue-agent` | MBP     | `Work`     | `~/pi-mono`                   | sendblue      | (varies)        |
| `imac-pi-ai`         | iMac    | `agent`    | `~/pi-mono` (on iMac)         | bluebubbles   | `pi-ai`         |
| `imac-exult-ai`      | iMac    | `exult`    | `~/Documents/GitHub/exult-agent` (on iMac) | sendblue | (varies) |
| `vm-exult-ai`        | VM      | `claude`   | `~/repos/exult-agent`         | sendblue      | `exult-agent`   |
| `vm-teams-ai`        | VM      | `claude`   | `~/repos/exult-agent`         | msteams       | `teams`         |

Repos in use: `pi-mono`, `exult-agent`. (openclaw is no longer used.)

## Hosts

| Node          | Hostname              | Tailscale IP      | Other addresses                  | Primary user(s)         |
| ------------- | --------------------- | ----------------- | -------------------------------- | ----------------------- |
| **MBP**       | `macbook`             | `100.100.183.111` | `macbook.tail053faf.ts.net`      | `Work`                  |
| **iMac**      | `gautams-imac`        | `100.92.200.34`   | `192.168.1.76` (LAN)             | `agent`, `ender`, `exult` |
| **Cloud VM**  | `claude-cloud`        | `100.125.203.102` | `46.224.71.218` (public IPv4)    | `claude`                |

## SSH host aliases (each side)

### MBP (`~/.ssh/config`)
| Alias                              | Target                                |
| ---------------------------------- | ------------------------------------- |
| `vm`, `claude-cloud`               | `claude@100.125.203.102` (Tailscale)  |
| `vm-public`                        | `claude@46.224.71.218` (public IPv4)  |
| `imac`, `imac-ender`, `imac-exult` | `<user>@100.92.200.34`                |
| `imac-local*`                      | `<user>@192.168.1.76` (LAN fallback)  |

### iMac (`~/.ssh/config` for each of agent/ender/exult)
| Alias                | Target                              |
| -------------------- | ----------------------------------- |
| `vm`, `claude-cloud` | `claude@100.125.203.102` (Tailscale)|
| `vm-public`          | `claude@46.224.71.218` (public)     |
| `mbp`, `macbook`     | `Work@100.100.183.111`              |

### VM (`~/.ssh/config`, user `claude`)
| Alias                                   | Target                       |
| --------------------------------------- | ---------------------------- |
| `imac`, `imac-ender`, `imac-exult`      | `<user>@100.92.200.34`       |
| `mbp`, `macbook`                        | `Work@100.100.183.111`       |

All aliases use `IdentityFile ~/.ssh/id_ed25519`, `StrictHostKeyChecking accept-new`, `ServerAliveInterval 60`.

## Keys (ed25519, fingerprints by comment)

| Origin              | Pubkey comment             | Authorized on                                       |
| ------------------- | -------------------------- | --------------------------------------------------- |
| MBP `Work@`         | `Work@MacBook-Pro-4.local` | VM (claude), iMac (agent/ender/exult) — pre-existing |
| iMac `agent@`       | `agent@iMac`               | VM (claude)                                         |
| iMac `ender@`       | `ender@iMac`               | VM (claude)                                         |
| iMac `exult@`       | `exult@iMac` (new)         | VM (claude)                                         |
| VM `claude@`        | `claude@claude-cloud`      | iMac (agent/ender/exult)                            |

Note: `exult@iMac` key generated 2026-05-23; user had no `~/.ssh/id_ed25519` prior.

## Terminal.app saved Servers

Both MBP and iMac (all 3 users) have these in their Terminal.app **Shell → New Remote Connection** Server list, stored via `defaults write com.apple.Terminal PermanentServers -array …`:

- `100.125.203.102` (VM)
- `100.100.183.111` (MBP) — only on iMac side
- `100.92.200.34` (iMac) — only on MBP side

## Tailscale SSH caveat

The VM has Tailscale SSH enabled. When `ssh vm` is run from a Tailscale peer that hasn't completed Tailscale's SSH browser auth on that device, Tailscale's daemon intercepts the connection and prints:

```
# Tailscale SSH requires an additional check.
# To authenticate, visit: https://login.tailscale.com/a/…
```

This is **per-device, one-time**. Either visit the URL once, or use the `vm-public` alias (routes to `46.224.71.218:22` via the public internet, bypasses Tailscale SSH, relies on ed25519 key auth).

The MBP is already authenticated; iMac users need to complete Tailscale SSH auth once each if they want the Tailscale path. `vm-public` works without it.

## Verification

From the MBP, the full matrix passes:

```bash
ssh vm 'hostname; whoami'           # → claude-cloud / claude
ssh imac 'hostname; whoami'         # → Gautams-iMac.local / agent
ssh vm 'ssh imac-exult "hostname"'  # → Gautams-iMac.local
ssh imac 'ssh vm-public "hostname"' # → claude-cloud
```

## Re-bootstrap

If a node loses its config, re-create the relevant `~/.ssh/config` block from this file. Key exchange uses standard `ssh-copy-id` or manual append to `~/.ssh/authorized_keys`. The VM's x11vnc Screen Sharing setup is a separate concern — see auto-memory `hetzner-vm-vnc-access`.

## Tracked in

- `~/pi-mono/.pi/ssh-mesh.md` (this file)
- `~/Documents/GitHub/exult-agent/ssh-mesh.md` (mirror)

Keep both copies in sync when this file changes.
