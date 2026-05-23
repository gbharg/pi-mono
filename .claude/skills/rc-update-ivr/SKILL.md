---
name: rc-update-ivr
description: Modify the RingCentral auto-receptionist IVR tree or after-hours greeting for the main Exult line (affects live call routing)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_fill_form, mcp__plugin_playwright_playwright__browser_snapshot
---

# rc-update-ivr

## Purpose
Modify the RingCentral IVR (auto-receptionist) tree or the after-hours greeting for the Exult Healthcare main line (469) 714-0006. This directly affects live call routing and every inbound caller hears the result, so it is a high-impact write requiring Gautam approval, a change window, and a verification test call.

## Current IVR state (Phone Tree April 2026)
Main auto-receptionist: extension `2000` (id `62579250008`).

Keypad map:
| Key | Label | Target | Ext/ID |
|---|---|---|---|
| 1 | Office Manager (Shaye) | User ext | 201 |
| 2 | Front Office / Scheduling | Call queue 55 | 881804009 |
| 3 | Prescription Requests | Mailbox / user ext | 8003 |
| 4 | Front Office (repeat) | Call queue 55 | 881804009 |
| 5 | Medical Records | Mailbox / user ext | 8004 |

Business hours: Mon-Fri 9:00-17:00 CT (America/Chicago). After hours: single greeting, all routes go to voicemail (ext 8002 main VM).

## Inputs
1. Change type: `update-greeting` / `update-keypad` / `update-schedule` / `swap-after-hours`
2. Which keypad key (if update-keypad): 1/2/3/4/5
3. New target extension or queue ID (if re-routing a key)
4. New greeting audio file path OR text for TTS (if update-greeting)
5. New business hours schedule (if update-schedule)
6. Change window: "immediate" (daytime, live callers impacted) or "after 5pm CT" (lower impact)
7. Reason / ticket ID for audit

## Prerequisites
- RC JWT creds at `/Users/agent/pi-mono/.config/exult/ringcentral.json` with `EditAccounts` + `ReadAccounts` scopes
- RC admin account (Gautam super admin)
- Gautam explicit per-request approval with change window confirmation
- Backup snapshot of current IVR config saved to `/Users/agent/pi-mono/.pi/services/rc/ivr-backup-<yyyymmdd-hhmm>.json` BEFORE any write
- Verification phone available to test-call after the change

## Workflow (API path - default)

### Step 1. Snapshot current IVR state
```
GET /restapi/v1.0/account/~/ivr-menus
GET /restapi/v1.0/account/~/ivr-menus/{ivrMenuId}
GET /restapi/v1.0/account/~/auto-receptionists
GET /restapi/v1.0/account/~/answering-rule          # for time-of-day routing
```
Save the JSON response to `/Users/agent/pi-mono/.pi/services/rc/ivr-backup-<yyyymmdd-hhmm>.json`. This is the rollback artifact.

### Step 2. Identify the target resource
For the main auto-receptionist (ext 2000, id 62579250008):
- `GET /account/~/extension/62579250008` returns the auto-receptionist metadata
- The actual IVR-menu object has its own `ivrMenuId` - fetch via `GET /account/~/ivr-menus` and match by name or by the auto-receptionist linkage

### Step 3. PAUSE for approval
Summary:
```
IVR CHANGE:
- Target: Main auto-receptionist ext 2000 (id 62579250008)
- Change type: [update-keypad / update-greeting / update-schedule]
- Specific change: [key 3 re-route from ext 8003 to ext 201]
- Effective: [immediately / after 5pm CT today]
- Callers impacted during change: estimated [0-5 callers in window]
- Backup saved to: /Users/agent/pi-mono/.pi/services/rc/ivr-backup-<timestamp>.json
- Rollback plan: restore from backup JSON via PATCH
Confirm?
```
Wait for explicit "go".

### Step 4. Apply the change
**Keypad re-route:**
```
PATCH /restapi/v1.0/account/~/ivr-menus/{ivrMenuId}
Content-Type: application/json
{
  "actions": [
    {"input": "1", "action": "Connect", "extension": {"id": "201"}},
    {"input": "2", "action": "Connect", "extension": {"id": "881804009"}},
    {"input": "3", "action": "Connect", "extension": {"id": "<NEW>"}},
    {"input": "4", "action": "Connect", "extension": {"id": "881804009"}},
    {"input": "5", "action": "Connect", "extension": {"id": "8004"}}
  ]
}
```
NOTE: RC REST API may require the full actions array even for a single-key change. Partial PATCH is not consistently supported - send the complete tree.

**Update greeting (audio):**
```
POST /restapi/v1.0/account/~/ivr-prompts
Content-Type: multipart/form-data
name=<prompt name>
attachment=<audio file>
```
Then PATCH the ivr-menu to reference the new `prompt.id`.

**Update greeting (TTS):**
```
PATCH /restapi/v1.0/account/~/ivr-menus/{ivrMenuId}
{
  "prompt": {
    "mode": "TextToSpeech",
    "text": "<new greeting text>",
    "language": {"id": "1033"}
  }
}
```

**Update schedule (business vs after-hours):**
Modify the `answering-rule` linked to the auto-receptionist, not the IVR menu itself. Schedule lives on the extension rule:
```
PUT /restapi/v1.0/account/~/extension/62579250008/answering-rule/business-hours-rule
```

### Step 5. Verify via readback
```
GET /restapi/v1.0/account/~/ivr-menus/{ivrMenuId}
```
Diff against the intended state. Every key/action pair must match.

### Step 6. Test-call verification
Call `(469) 714-0006` from a test phone. Walk through the impacted keypad path. Confirm:
- Greeting plays as intended
- Keypress routes to the correct destination
- Hold music / queue behavior works
- After-hours greeting plays if after 5pm CT (requires test outside hours)

### Step 7. Audit log entry
Append to `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`:
```
IVR CHANGE | yyyy-mm-dd hh:mm | change=<type> | diff=<summary> | backup=<file> | verified=YES | by=claude-via-gautam
```

## Workflow (UI fallback path)
1. Playwright nav to `https://service.ringcentral.com` (or admin portal)
2. Sign in as Gautam (creds from `admin-credentials.json` `ringcentral.admin`)
3. Phone System -> Auto-Receptionist -> IVR Menus -> Main (ext 2000)
4. Make the change, click **Save**
5. Screenshot before + after screens

## Per-request approval
REQUIRED. Every IVR change. Approval must include:
- Change type
- Specific keypad key or field affected
- Before -> after values
- Change window (immediate vs after-hours)
- Rollback confirmation (backup saved)

For emergency routing (e.g., "phone system down, forward everything to cell"), Gautam may approve verbally via iMessage and backfill the audit entry within 24 hours.

## Verification
- Readback GET matches intended config
- Test call confirms audible / routing behavior
- Backup file exists and is valid JSON
- Audit entry written

## Rollback
- Revert via PATCH using the snapshot JSON from Step 1
- Or use RC UI "Restore from history" (RC keeps the last 30 days of config versions)
- Test-call after rollback to confirm

## Common pitfalls
- **Partial PATCH rejected**: RC may require the complete `actions` array on every update. If single-key PATCH 400s, send the full array.
- **TTS voice quality**: RC default TTS is robotic. Record a real audio file for the main greeting.
- **Time zone drift**: The schedule is stored in the RC-configured office time zone. Exult is America/Chicago. Don't mix in UTC.
- **Ring group vs call queue**: Ext 881804009 is a CALL QUEUE (queue 55). Don't confuse with a ring group - different API object.
- **Dead mailbox routing**: ext 8003 / 8004 may be voicemail-only mailboxes, not actual user extensions. Verify before re-routing.
- **Live caller impact**: A mid-day change can drop the current caller. Announce change window; prefer after-hours unless urgent.
- **Prompt ID orphaned**: If you upload a new audio prompt but don't update the IVR to reference it, the old prompt still plays. Always PATCH the menu after upload.
- **Greeting PHI**: Never put patient-specific info in a greeting. Generic only.
- **Locale ID**: RC uses Microsoft LCID codes for TTS language. `1033` = en-US. Wrong LCID = wrong voice.

## References
- RC API ivr-menus: https://developers.ringcentral.com/api-reference/IVR
- RC API auto-receptionists: https://developers.ringcentral.com/api-reference/Auto-Receptionist
- RC API answering-rules: https://developers.ringcentral.com/api-reference/Call-Handling-and-Forwarding
- Memory: `reference_rc_phone_routing.md`, `reference_admin_credentials.md`
- JWT creds: `/Users/agent/pi-mono/.config/exult/ringcentral.json`
- Backup directory: `/Users/agent/pi-mono/.pi/services/rc/` (TODO: create if not present)
- Audit log: `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`
