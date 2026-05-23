---
name: rc-forward-number-to-queue
description: Temporarily forward a specific RingCentral DID to the Front Office call queue 55 during staff coverage gaps
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_snapshot
---

# rc-forward-number-to-queue

## Purpose
Set a temporary call-forwarding rule that redirects a specific DID or extension at Exult Healthcare to the Front Office call queue 55 (ext 881804009), used when a staff member is out, at lunch, in a meeting, or during an unplanned coverage gap. Supports a schedule so the forward auto-expires. Minimizes dropped calls during the solo-front-desk period (per memory `user_gautam_role.md`).

## Inputs
1. Source extension or DID to forward (e.g., ext 201 Shaye, or a direct DID)
2. Destination queue (default: Front Office queue 55 = ext 881804009)
3. Forward duration: one-time, recurring weekly, or permanent-until-cancelled
4. Start / end timestamps (America/Chicago)
5. Optional: custom greeting ("Shaye is at lunch, transferring you to the front desk") - TTS or uploaded audio
6. Reason / ticket ID for audit

## Prerequisites
- RC JWT creds at `/Users/agent/pi-mono/.config/exult/ringcentral.json` with `EditExtensions` + `ReadAccounts` + `EditCallHandling` scopes
- Source extension exists and is owned / admin-controllable
- Target queue 55 (ext 881804009) is active with at least 1 agent
- Gautam explicit per-request approval (live call routing change)
- Snapshot of current answering rules saved before the change

## Workflow (API path - default)

### Step 1. Snapshot current answering rules
```
GET /restapi/v1.0/account/~/extension/{sourceExtId}/answering-rule
```
Save to `/Users/agent/pi-mono/.pi/services/rc/fwd-backup-<sourceExt>-<yyyymmdd-hhmm>.json`. This is the rollback artifact.

Identify:
- Default `business-hours-rule` and `after-hours-rule`
- Any existing custom rules (name, schedule, enabled status)

### Step 2. Decide rule strategy
Two approaches:

**Approach A - new custom rule (preferred for temporary forwards):**
Create a new answering rule with `type=Custom`, scheduled for the coverage window. Lower conflict with default rules.

**Approach B - modify business-hours-rule (for permanent changes):**
PUT on the business-hours-rule. Only use if the change is indefinite. Must also handle rollback to restore original.

For this skill, default to Approach A.

### Step 3. PAUSE for approval
Summary:
```
CALL FORWARD:
- Source: ext <id> (<user name or DID>)
- Destination: Front Office queue 55 (ext 881804009)
- Duration: [one-time 12:00-13:00 today] or [recurring Mon-Fri 12:00-13:00] or [until Gautam cancels]
- Greeting: [none / TTS "Shaye is at lunch..."]
- Effective: immediately
- Backup saved: /Users/agent/pi-mono/.pi/services/rc/fwd-backup-<ext>-<timestamp>.json
Confirm?
```
Wait for explicit "go".

### Step 4. Create the custom answering rule
```
POST /restapi/v1.0/account/~/extension/{sourceExtId}/answering-rule
Content-Type: application/json
{
  "name": "Forward to Queue 55 - <reason> - <yyyymmdd>",
  "enabled": true,
  "type": "Custom",
  "schedule": {
    "weeklyRanges": {
      "monday":    [{"from": "12:00", "to": "13:00"}],
      "tuesday":   [{"from": "12:00", "to": "13:00"}]
      /* ... etc */
    }
    /* OR for a single date range: */
    /* "ranges": [{"from": "2026-04-10T12:00:00", "to": "2026-04-10T13:00:00"}] */
  },
  "callHandlingAction": "TransferToExtension",
  "transfer": {
    "extension": {"id": "881804009"}
  },
  "greeting": [
    {
      "type": "Introductory",
      "preset": {"id": "0"},
      "custom": {
        "contentType": "audio/mpeg",
        "uri": "<optional prompt URI>"
      }
    }
  ]
}
```
NOTE: RC answering-rule schema varies by endpoint version. Exact field names (`callHandlingAction` vs `callHandling` vs `forwarding`) should be verified via a GET on an existing rule first. TODO: verify schema against RC API docs at call time.

### Step 5. Verify via readback
```
GET /restapi/v1.0/account/~/extension/{sourceExtId}/answering-rule
```
Confirm:
- New rule appears with correct name, schedule, transfer target
- `enabled=true`
- No conflict with existing custom rules (priority order)

### Step 6. Test-call verification
Call the source DID or ext from a test phone during the forward window. Confirm:
- Greeting plays (if set)
- Call routes into the Front Office queue
- Queue hold music plays
- Queue agents receive the call

### Step 7. Auto-expire / manual cancel
- **Schedule-based**: RC respects the `schedule.ranges` or `weeklyRanges` and the rule becomes effectively inactive outside those windows
- **Manual cancel**: `DELETE /account/~/extension/{sourceExtId}/answering-rule/{ruleId}` when the coverage gap ends
- Always confirm cancellation with a test call

### Step 8. Audit log entry
Append to `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`:
```
FWD CREATED | yyyy-mm-dd hh:mm | src=ext<id> | dst=q55 | window=<start>..<end> | rule=<ruleId> | backup=<file>
```

## Workflow (UI fallback path)
1. Playwright nav to `https://service.ringcentral.com`
2. Phone System -> Users -> pick the source user -> Call Handling & Forwarding -> Custom Rule
3. Create rule with schedule + forward-to queue 55
4. Click **Save**
5. Screenshot the rule list

## Per-request approval
REQUIRED for every forward. Approval must confirm:
- Source ext / user
- Destination queue
- Duration + specific window
- Whether a greeting is played

Recurring / standing forwards (e.g., "always forward ext 201 during lunch") may be approved once with a renewal every 30 days.

## Verification
- New rule visible in `GET /answering-rule`
- Test call routes correctly during window
- Outside window, calls go to original destination
- Audit entry written

## Rollback
- `DELETE /account/~/extension/{sourceExtId}/answering-rule/{ruleId}` to remove
- Restore from backup JSON if the original default rules were modified (Approach B)
- Test call after rollback

## Common pitfalls
- **Schedule time zone**: RC uses the extension home time zone. Exult defaults are America/Chicago. Mixing UTC will skew windows 5-6 hours.
- **Rule priority order**: Multiple custom rules on the same extension execute in priority order. A new rule may get shadowed by an existing higher-priority rule. Check the list.
- **Queue full behavior**: If queue 55 is already at capacity (max wait reached), forwarded calls get the overflow treatment (usually voicemail 8002). Patient may be confused. Set expectations.
- **Greeting pulled from wrong prompt**: RC greeting IDs are account-global. Don't reference a prompt ID that belongs to another extension.
- **Schedule vs always-on**: `type=Always` ignores the schedule entirely. Use `type=Custom` with explicit schedule for temporary forwards.
- **Business hours rule collision**: If the business-hours-rule already has a forwarding action, the custom rule may or may not override depending on priority. Test.
- **Dead destination**: Forwarding to an extension that is disabled, on DND, or has no answer sends calls into voicemail silently. Verify queue 55 has active agents.
- **Forgot to cancel**: The most common failure. Set a calendar reminder or use schedule-based expiry.

## References
- RC API answering-rules: https://developers.ringcentral.com/api-reference/Call-Handling-and-Forwarding
- RC API call queues: https://developers.ringcentral.com/api-reference/Call-Queues
- Memory: `reference_rc_phone_routing.md`, `user_gautam_role.md`
- Related skill: `rc-update-call-queue` (for queue membership), `rc-update-ivr` (for main-line IVR)
- JWT creds: `/Users/agent/pi-mono/.config/exult/ringcentral.json`
- Backup directory: `/Users/agent/pi-mono/.pi/services/rc/`
- Audit log: `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`
- TODO: verify exact RC answering-rule schema (field names) via GET before first write
