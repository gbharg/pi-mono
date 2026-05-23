---
name: computer-use
version: v1.0.0
description: "Use CUA and Peekaboo for iMac desktop automation (screenshots, app launch, click/type, element-based targeting, accessibility tree, approvals, autonomous run_task). Hybrid CUA + Peekaboo routing."
user-invocable: false
disable-model-invocation: true
---

# Computer Use (iMac)

Use this skill when a task requires desktop GUI automation on the iMac.

> **FR-003: CUA-Peekaboo Hybrid** — This skill covers hybrid GUI automation on
> the iMac using CUA (HTTP API) and Peekaboo (CLI). Element-based commands
> (`find_element`, `accessibility_tree`) provide fast, VLM-free targeting.

## Use when

- User asks to take iMac screenshots
- User asks to open desktop apps and click through dialogs
- Approving admin/SecurityAgent prompts
- Writing text into terminals or apps
- Task requires autonomous desktop navigation (`run_task`)
- Element-based targeting (`find_element`, `accessibility_tree`)

## Architecture

- **CUA server**: `http://100.92.200.34:8000` (iMac Tailscale IP), launchd `com.openclaw.cua-server`
- **Peekaboo**: `/opt/homebrew/bin/peekaboo` on iMac, via SSH
- **Both tools have TCC permissions**: Screen Recording + Accessibility granted

## Core constraints

- iMac at `gautams-imac` / `100.92.200.34` (Tailscale)
- SSH: `sshpass -p "$IMAC_SSH_PASS" ssh agent@gautams-imac`
- `run_task` is approval-gated (uses VLM, costs money)
- Fail closed if CUA health check fails

## Preferred flow

1. Validate CUA health: `curl -s http://100.92.200.34:8000/status`
2. Use `find_element` / `accessibility_tree` for known UI elements (free, fast)
3. Use `run_command` for shell operations
4. Use `run_task` only for complex multi-step GUI workflows
5. Re-screenshot and verify state after critical actions

## Key actions

- `screenshot`
- `left_click`, `double_click`, `right_click`, `move_cursor`, `drag_to`, `scroll`
- `type_text`, `press_key`, `hotkey`, `run_command`
- `find_element` — element-based targeting by role/title/value (fast, free, no VLM)
- `get_accessibility_tree` — full UI element hierarchy
- `run_task` — autonomous VLM agent loop (costs money)

## Two automation backends

| Backend               | Method                                    | Cost | Speed         |
| --------------------- | ----------------------------------------- | ---- | ------------- |
| **Peekaboo (CLI)**    | Accessibility APIs via SSH                | Free | Fast (~100ms) |
| **CUA element-based** | `find_element` / `get_accessibility_tree` | Free | Fast (~200ms) |
| **CUA vision**        | VLM screenshot loop (`run_task`)          | $$$  | Slow (5-30s)  |

### When to use which

- **Peekaboo**: App listing, annotated screenshots with element IDs (B1, T3), clicking by element ID, typing, dialog handling, menu navigation
- **CUA element-based**: Find elements by accessibility role/title, get full UI tree, coordinate-based clicking
- **CUA vision**: Complex multi-step workflows where you don't know the exact element names

### Decision tree

```
Need GUI automation on iMac?
│
├─ Known element (role/title/label)?
│  └─ CUA find_element → click at returned coords (fast, free)
│
├─ Need annotated screenshot with clickable IDs?
│  └─ Peekaboo: peekaboo see --annotate (via SSH)
│
├─ Need app/window management?
│  └─ Peekaboo: peekaboo app/window commands (via SSH)
│
├─ Need full UI element tree?
│  └─ CUA get_accessibility_tree
│
└─ Unknown layout / multi-step workflow?
   └─ CUA run_task (vision-based, costs money)
```

**Always try element-based first.** Fall back to vision only when elements can't be found.

## CUA API usage

### From MacBook Pro (via Tailscale)

```bash
# Health check
curl -s http://100.92.200.34:8000/status

# Screenshot
curl -s -X POST http://100.92.200.34:8000/cmd \
  -H "Content-Type: application/json" \
  -d '{"command":"screenshot","params":{}}'

# Run a shell command
curl -s -X POST http://100.92.200.34:8000/cmd \
  -H "Content-Type: application/json" \
  -d '{"command":"run_command","params":{"command":"open -a Terminal"}}'

# Find element
curl -s -X POST http://100.92.200.34:8000/cmd \
  -H "Content-Type: application/json" \
  -d '{"command":"find_element","params":{"role":"AXButton","title":"OK"}}'

# Click at coordinates
curl -s -X POST http://100.92.200.34:8000/cmd \
  -H "Content-Type: application/json" \
  -d '{"command":"left_click","params":{"x":500,"y":300}}'

# Type text
curl -s -X POST http://100.92.200.34:8000/cmd \
  -H "Content-Type: application/json" \
  -d '{"command":"type_text","params":{"text":"hello world"}}'

# Get accessibility tree
curl -s -X POST http://100.92.200.34:8000/cmd \
  -H "Content-Type: application/json" \
  -d '{"command":"get_accessibility_tree","params":{}}'
```

### From iMac (localhost)

Same commands but use `http://localhost:8000` instead.

## Peekaboo usage (via SSH)

```bash
SSH="sshpass -p "$IMAC_SSH_PASS" ssh agent@gautams-imac"
PB="export PATH=/opt/homebrew/bin:\$PATH && peekaboo"

# List running apps
$SSH "$PB list apps"

# Annotated screenshot (element IDs for clicking)
$SSH "$PB see --annotate --path /tmp/peekaboo-see.png"

# Click element by ID
$SSH "$PB click --on B1"

# Type text
$SSH "$PB type 'hello world'"

# Launch app
$SSH "$PB app launch Safari"

# Handle dialog
$SSH "$PB dialog click --title 'OK'"

# Hotkey
$SSH "$PB hotkey --keys 'cmd,shift,t'"
```

## Approving admin prompts

SecurityAgent windows are admin authentication dialogs. To approve:

```bash
# 1. Find the password field
curl -s -X POST http://100.92.200.34:8000/cmd \
  -H "Content-Type: application/json" \
  -d '{"command":"find_element","params":{"role":"AXTextField","title":"Password"}}'

# 2. Click on it
curl -s -X POST http://100.92.200.34:8000/cmd \
  -H "Content-Type: application/json" \
  -d '{"command":"left_click","params":{"x":<x>,"y":<y>}}'

# 3. Type the password
curl -s -X POST http://100.92.200.34:8000/cmd \
  -H "Content-Type: application/json" \
  -d '{"command":"type_text","params":{"text":"<password>"}}'

# 4. Click OK
curl -s -X POST http://100.92.200.34:8000/cmd \
  -H "Content-Type: application/json" \
  -d '{"command":"find_element","params":{"role":"AXButton","title":"OK"}}'
# Then click at the returned coordinates
```

## CUA API endpoints

| Endpoint     | Method | Purpose                                         |
| ------------ | ------ | ----------------------------------------------- |
| `/status`    | GET    | Health check                                    |
| `/cmd`       | POST   | Execute single commands (`{ command, params }`) |
| `/responses` | POST   | Autonomous agent loop (`{ model, input }`)      |

Commands via `/cmd`: `screenshot`, `left_click`, `double_click`, `right_click`, `move_cursor`, `drag_to`, `scroll`, `scroll_up`, `scroll_down`, `type_text`, `press_key`, `hotkey`, `run_command`, `find_element`, `get_accessibility_tree`, `version`.

## Hybrid dispatch CLI

`scripts/cua/hybrid-dispatch.sh` provides a unified CLI:

```bash
# iMac screenshots (CUA)
scripts/cua/hybrid-dispatch.sh screenshot --target vm

# Host screenshots (Peekaboo)
scripts/cua/hybrid-dispatch.sh screenshot --target host

# Find element on iMac
scripts/cua/hybrid-dispatch.sh find-element --role AXButton --title OK

# Run autonomous task
scripts/cua/hybrid-dispatch.sh run "open System Settings and click Privacy"
```

`--target vm` remains the CLI alias for the remote CUA backend on the iMac.

Override CUA base URL: `CUA_BASE=http://100.92.200.34:8000`

## Launchd service

- **Plist**: `~/Library/LaunchAgents/com.openclaw.cua-server.plist` (on iMac)
- **Logs**: `/tmp/cua-server.log`
- **Restart**: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.openclaw.cua-server.plist && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.openclaw.cua-server.plist`

## Related skills

- **peekaboo** — Peekaboo CLI reference (all commands)
- **hybrid-dispatch.sh** — Unified CLI routing (`scripts/cua/hybrid-dispatch.sh`)
- **openclaw** — iMac management
