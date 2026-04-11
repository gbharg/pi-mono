---
name: rc-disable-extension
description: Offboard a RingCentral user by disabling the extension, removing from queues, and archiving voicemails
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__plugin_playwright_playwright__browser_navigate
---

# rc-disable-extension

## Purpose
Safely offboard a RingCentral user: disable (not delete) their extension, remove them from all call queues and ring groups, archive their voicemails, cancel any direct # routing, and free their DID. Keeps history intact for audit / legal / reactivation. Cost impact: disabling does NOT free the license seat automatically — license reclamation is a separate billing action requiring Gautam approval.

## Inputs
1. User to offboard (name, email, or extension number)
2. Effective date (immediate / future — if future, this skill should be scheduled)
3. Preserve voicemails? (default: yes, export to `/tmp/rc-offboard-<ext>/voicemails/`)
4. Forward calls to? (replacement user ext / auto-receptionist / drop)
5. Reclaim license seat? (separate approval + billing action)
6. Preserve direct #? (port out / release / reassign)

## Prerequisites
- RC JWT creds (`EditExtensions`, `EditAccounts`, `ReadMessages`, `ReadCallRecording`)
- Gautam explicit approval (offboarding has HR + legal implications)
- Confirmed separation date from HR/Gautam
- Backup plan for inbound calls to that extension/DID

## Workflow (API path — default)

### Step 1. Locate the extension
```
GET /restapi/v1.0/account/~/extension?perPage=1000
```
Filter by email or extensionNumber. Capture `id`, `extensionNumber`, `contact.email`, `phoneNumbers[]` (DID list), current status.

### Step 2. Inventory everything tied to this extension
```
GET /restapi/v1.0/account/~/extension/<id>/phone-number    # DIDs
GET /restapi/v1.0/account/~/extension/<id>/call-queues     # queue membership
GET /restapi/v1.0/account/~/extension/<id>/device          # assigned devices
GET /restapi/v1.0/account/~/extension/<id>/message-store?messageType=VoiceMail  # voicemails
```
Write inventory to `/tmp/rc-offboard-<ext>-<timestamp>/inventory.json` (chmod 0600). This is the rollback manifest.

### Step 3. PAUSE for approval
Summary:
```
Offboard RC extension:
- User: <first last>
- Ext: <number> (id <id>)
- Email: <email>
- DIDs: <count> direct numbers
- Queue memberships: <list>
- Voicemails: <count> (archive: yes/no)
- Device: <softphone/desk phone — needs return?>
- Reclaim seat: <yes/no>
Confirm?
```

### Step 4. Archive voicemails (if requested)
For each message id:
```
GET /restapi/v1.0/account/~/extension/<id>/message-store/<msg-id>/content/<attachment-id>
```
Save as `.mp3` or `.wav` to the offboard dir. Filename format: `vm_<timestamp>_<caller-last4>.mp3` (no caller name in filename).

### Step 5. Remove from all call queues
For each queueId from Step 2:
```
DELETE /restapi/v1.0/account/~/call-queues/<queue-id>/members/<ext-id>
```
(TODO: verify — some RC versions use `bulk-assign` PUT instead. Check response + fall back.)

Priority: remove from Front Office queue 55 (id 881804009) FIRST so incoming patient calls stop ringing the dead ext.

### Step 6. Cancel direct # routing
For each DID assigned to this extension:
- Option A: unassign (return to pool) — `PUT /account/~/phone-number/<id>` with new owner
- Option B: forward to auto-receptionist ext 2000 (id 62579250008)
- Option C: forward to replacement user
Pick per Step 1 input. If unsure, default to forwarding to auto-receptionist.

### Step 7. Disable the extension
```
PUT /restapi/v1.0/account/~/extension/<id>
{
  "status": "Disabled"
}
```
This preserves the extension record, voicemails, and history, but prevents login and inbound call delivery.

### Step 8. Handle device return (manual step)
Extension may have a physical phone (Polycom, Yealink, etc). Update inventory: mark for return/retrieval. Physical retrieval is a task, not this skill — log as a followup.

### Step 9. Reclaim license seat (OPTIONAL, separate approval)
Reclamation changes billing. Requires a separate `PUT /account/~/extension/<id>` with `type: "Virtual"` or a support ticket. Only do this if Gautam explicitly approved in Step 3.

### Step 10. Verify + log
```
GET /restapi/v1.0/account/~/extension/<id>
```
Confirm: status=Disabled, no queue memberships, DIDs reassigned. Append to `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`:
```
- <ISO> rc offboard: ext=<number>, email=<masked>, queues_removed=<count>, dids_reassigned=<count>, vm_archived=<count>, seat_reclaimed=<y/n>, approved_by=Gautam
```

## Workflow (UI fallback path)
If API is blocked:
1. Navigate to `https://service.ringcentral.com/` -> Users -> find user -> **Disable**
2. Remove from call queues: Phone System -> Groups -> each queue -> Members -> remove
3. Direct #: Phone System -> Phone Numbers -> find user -> reassign

## Per-request approval
- Step 3 is the approval gate. REQUIRED.
- Step 9 (seat reclaim) is a SECOND approval if the user wants to reduce the license count.
- Never delete-delete an extension. RC does not support reactivation of deleted extensions via API; you would have to recreate from scratch and lose all history.

## Verification
- Extension status=Disabled
- Zero queue memberships
- DIDs either unassigned or forwarded per plan
- Voicemails archived locally (file count matches inventory)
- Audit log appended

## Rollback
- Re-enable the extension: `PUT /account/~/extension/<id>` with `status: Enabled`
- Re-add to queues: use the queue ID list from `inventory.json` and `POST /call-queues/<id>/members` for each
- Reassign DID back: use the previous phoneNumberId and `PUT /phone-number/<id>`
- Restore voicemails: voicemails are preserved inside RC even when disabled — they come back on re-enable. The local archive is a belt-and-suspenders backup.

## Common pitfalls
- **Disable != delete**: Disabled extensions still appear in user lists and still count against seat caps for licensing. Reclamation is separate.
- **Queue orphan calls**: Remove from queues FIRST, before disable. If you disable first, some RC versions hold queue entries and ring the dead ext for a while.
- **DID left assigned**: A disabled extension with an assigned DID will drop inbound calls to that number. Always reassign or forward.
- **Front Office queue 55**: This is the main patient-facing queue. Removing a member reduces coverage — verify replacement before removing (confirm with Gautam).
- **Voicemail export timing**: Do the archive BEFORE disable. After disable, some RC API endpoints stop returning data for the extension.
- **2FA on UI login**: Goes to Raj's email. Prefer API path.

## References
- RC API: https://developers.ringcentral.com/api-reference/Extensions/updateExtension
- RC KB (disable user): https://support.ringcentral.com/article-v2/disable-user.html
- Archive: `/Users/agent/pi-mono/.pi/services/rc_archive/extensions.json`
- Credentials: `/Users/agent/pi-mono/.config/exult/ringcentral.json`
