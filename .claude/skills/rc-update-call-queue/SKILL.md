---
name: rc-update-call-queue
description: Add or remove members from a RingCentral call queue (Front Office queue 55 or others)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_ringcentral_getCallQueues, mcp__plugin_playwright_playwright__browser_navigate
---

# rc-update-call-queue

## Purpose
Modify the membership of a RingCentral call queue (add or remove agents). For Exult the primary queue is **Front Office queue 55** (extension id `881804009`) which is the patient-facing ring group. Also handles other queues like clinical, billing, or nurse lines. Coverage must be verified before removing anyone — dropping below one active member breaks incoming patient routing.

Important memory context: the Front Office queue historically used a **rotating ring mode** and contained dead extensions (see `reference_rc_phone_routing.md`). Part of this skill is verifying every member is alive before saving.

## Inputs
1. Queue target (Front Office 55 by default, or other queue by name/id)
2. Operation: add / remove / reorder / change ring mode
3. Extensions affected (by ext number, name, or id)
4. Effective time (now / future — future needs scheduling)
5. Ring strategy change? (simultaneous / rotating / sequential)

## Prerequisites
- RC JWT creds (`EditAccounts`, `EditExtensions`)
- Current queue state snapshot — take one before modifying so rollback is possible
- Minimum coverage: at least 1 live member after the change (2+ preferred for Front Office)
- For removals: confirm the person being removed is offboarded or intentionally rotated out

## Workflow (API path — default)

### Step 1. Get OAuth token from JWT (same as `rc-add-extension`)
```bash
TOKEN=$(curl -sX POST "https://platform.ringcentral.com/restapi/oauth/token" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
  -d "assertion=$JWT" | jq -r .access_token)
```

### Step 2. Locate the queue
Front Office is known (ext 55, id 881804009). For other queues:
```
GET /restapi/v1.0/account/~/call-queues
```
Filter by name. Capture `id` and `extensionNumber`.

### Step 3. Snapshot current membership
```
GET /restapi/v1.0/account/~/call-queues/<queue-id>/members
```
Save to `/tmp/rc-queue-<id>-<timestamp>-before.json`. This is the rollback state.

Also snapshot settings (ring mode, hold timeout, etc):
```
GET /restapi/v1.0/account/~/call-queues/<queue-id>
```

### Step 4. Verify each existing member is alive
For each member extensionId:
```
GET /restapi/v1.0/account/~/extension/<ext-id>
```
Flag any member with:
- `status != Enabled`
- No recent activity (use `/account/~/extension/<id>/presence` if needed)
- Contact info stale (email bounces, no device)

Present to Gautam: "Queue <name> has <N> members. <M> appear dead: <list>. Clean these up as part of this change?"

### Step 5. PAUSE for approval
Summary:
```
Queue <name> (<id>) update:
- Current members: <count>
- Coverage after change: <count>
- Adding: <ext list>
- Removing: <ext list>
- Ring mode change: <yes/no -> new mode>
- Dead members flagged: <list>
Confirm?
```

### Step 6. Add members
Method A — `POST /call-queues/<id>/members`:
```
POST /restapi/v1.0/account/~/call-queues/<queue-id>/members
{
  "records": [
    {"id": "<ext-id>"},
    {"id": "<ext-id>"}
  ]
}
```

Method B — `PUT /call-queues/<id>/bulk-assign`:
```
PUT /restapi/v1.0/account/~/call-queues/<queue-id>/bulk-assign
{
  "addedExtensionIds": ["<ext-id>", ...],
  "removedExtensionIds": ["<ext-id>", ...]
}
```
TODO: verify which endpoint is exposed for your RC API version. `bulk-assign` is newer and handles add+remove in one call.

### Step 7. Remove members
If using Method A above, remove via:
```
DELETE /restapi/v1.0/account/~/call-queues/<queue-id>/members/<ext-id>
```
If using Method B (bulk-assign), include in the `removedExtensionIds` array.

### Step 8. Update ring mode (if requested)
```
PUT /restapi/v1.0/account/~/call-queues/<queue-id>
{
  "serviceLevelSettings": {...},
  "alertSettings": {
    "ringMode": "Rotating"   // or "FixedOrder" or "Simultaneous"
  }
}
```
TODO: verify exact payload shape — RC call queue settings API has evolved. Inspect the `GET` response from Step 3 to mirror the structure.

### Step 9. Verify
```
GET /restapi/v1.0/account/~/call-queues/<queue-id>/members
```
Confirm: expected members present, no duplicates, removed members are gone. Count matches `current + added - removed`.

### Step 10. Smoke test (optional but recommended)
Place a test call to the queue (ext 55 internally, or the main number (469) 714-0006). Confirm:
- Ring flows to expected members
- Hold music plays if nobody answers
- Overflow routes correctly after timeout

### Step 11. Log
Append to `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`:
```
- <ISO> rc queue update: queue=<id/name>, added=<count>, removed=<count>, ring_mode=<mode>, coverage=<N>, approved_by=Gautam
```

## Workflow (UI fallback)
1. Navigate to `https://service.ringcentral.com/` -> Phone System -> Groups -> Call Queues
2. Select the queue -> Members tab
3. Click **Add** or **Remove** for each change
4. Save

## Per-request approval
- Step 5 is the approval gate. REQUIRED for any queue affecting patient-facing routing.
- If coverage would drop below 2 active members for Front Office, require a SECOND explicit confirmation.
- Changes to ring mode must be tested after.

## Verification
- Member list matches expected state
- Test call routes correctly
- No member has duplicate entries
- Audit log written

## Rollback
- Use the `before.json` snapshot from Step 3
- `PUT /bulk-assign` with the inverse `addedExtensionIds` / `removedExtensionIds`
- OR delete/add individually from the snapshot
- Always restore ring mode from the original `GET` response

## Common pitfalls
- **Coverage drop**: Removing the last member means patient calls fail at the queue. Always verify count before saving.
- **Dead extensions still in queue**: Per memory `reference_rc_phone_routing.md`, Front Office had ghost members. Clean them out as part of any update, but only with approval.
- **Rotating ring mode stuck on a dead ext**: If the queue uses rotating mode and the "next to ring" slot is a disabled extension, ALL calls ring that slot and go to VM. Fix: either remove the dead ext or switch to simultaneous.
- **Member order matters for FixedOrder**: The first member rings first. Changing the order via API requires re-sending the full list.
- **Permissions**: Adding a member who doesn't have queue-agent role may silently fail. Check role assignments.

## References
- RC API: https://developers.ringcentral.com/api-reference/Call-Queues
- RC KB (call queue setup): https://support.ringcentral.com/article-v2/8068.html
- Memory: `reference_rc_phone_routing.md`
- Archive: `/Users/agent/pi-mono/.pi/services/rc_archive/FRONT_OFFICE_QUEUE_PLAN.md`
- Credentials: `/Users/agent/pi-mono/.config/exult/ringcentral.json`
