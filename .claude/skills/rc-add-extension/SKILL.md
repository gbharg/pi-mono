---
name: rc-add-extension
description: Provision a new RingCentral user or admin extension with template assignment and welcome email
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_ringcentral_sendSms, mcp__claude_ai_Keragon__com_keragon_microsoftoutlook_sendMail, mcp__plugin_playwright_playwright__browser_navigate
---

# rc-add-extension

## Purpose
Provision a new RingCentral extension for Exult Healthcare (account 2761864020). Adds a user or admin seat, assigns an extension number, applies a role/template, and triggers the welcome email so the new user can activate their account. Must check seat availability first — a missing seat triggers a new license charge, which requires Gautam budget approval.

## Inputs
1. New user full name
2. New user email (Exult email preferred, e.g., `first.last@exulthealthcare.com`)
3. Extension number preference (or "auto")
4. Role: `User` / `Standard (International)` / `Super Admin` / `Office Manager` / custom
5. Department (front office / clinical / billing / admin)
6. Device: existing phone, new softphone, or new desk phone (affects shipping + cost)
7. Add to call queues: Front Office queue 55? Other queues? (See `rc-update-call-queue`.)
8. Direct # required? (separate DID — costs more)

## Prerequisites
- RC JWT creds at `/Users/agent/pi-mono/.config/exult/ringcentral.json` (account_id `2761864020`, scopes include `EditAccounts`, `EditExtensions`, `RoleManagement`)
- Current license/seat count: call `GET /account/~` and inspect `serviceInfo.servicePlan` + compare to active extensions
- Gautam budget approval IF adding the seat creates a new license charge
- Email address must be unique in the account (not reused across extensions)

## Workflow (API path — default)

### Step 1. Get OAuth token from JWT
```bash
curl -sX POST "https://platform.ringcentral.com/restapi/oauth/token" \
  -u "$(jq -r .client_id /Users/agent/pi-mono/.config/exult/ringcentral.json):$(jq -r .client_secret /Users/agent/pi-mono/.config/exult/ringcentral.json)" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
  -d "assertion=$(jq -r .jwt /Users/agent/pi-mono/.config/exult/ringcentral.json)"
```
Capture `access_token`.

### Step 2. Check seat availability
```
GET /restapi/v1.0/account/~/extension?status=Enabled&perPage=1000
```
Count enabled user extensions. Compare to licensed seat count from `GET /restapi/v1.0/account/~`. If at or near cap, STOP and ask Gautam: "Adding this extension will require a new license ($X/mo). Approve?"

### Step 3. Find an available extension number
```
GET /restapi/v1.0/account/~/extension?perPage=1000
```
Scan `extensionNumber` values, pick the lowest unused in the 1xx / 2xx range (front office typically 1xx, clinical 2xx, admin 3xx). Front desk lead is ext 104; do not reuse.

### Step 4. PAUSE for approval
Summary:
```
Provision RC extension:
- Name: <first last>
- Email: <email>
- Ext: <number>
- Role: <role>
- Device: <softphone/desk phone>
- Queues: <list>
- New license required: <yes/no>
- Estimated monthly cost delta: $<amt>
Confirm?
```

### Step 5. Create the extension
```
POST /restapi/v1.0/account/~/extension
Content-Type: application/json

{
  "contact": {
    "firstName": "<first>",
    "lastName": "<last>",
    "email": "<email>"
  },
  "extensionNumber": "<number>",
  "type": "User",
  "status": "Enabled"
}
```
Capture the returned `id` (this is the extension id, not the extension number).

TODO: verify — `status: NotActivated` may be required initially so the welcome email can trigger activation. Test in sandbox if possible; for prod, use `Enabled` first and fall back to `NotActivated` if activation is blocked.

### Step 6. Assign role
Roles are IDs, not names. Look up:
```
GET /restapi/v1.0/account/~/user-role
```
Then assign:
```
PUT /restapi/v1.0/account/~/extension/<ext-id>
{"roles": [{"id": "<role-id>"}]}
```

### Step 7. Trigger welcome email
```
POST /restapi/v1.0/account/~/extension/<ext-id>/activation-link
```
This sends the RC-branded welcome email to the user with a setup link. Verify in Outlook sent folder or RC admin UI.

### Step 8. Add to call queues (if requested)
Hand off to `rc-update-call-queue` skill for Front Office queue 55 or other queues.

### Step 9. Verify
```
GET /restapi/v1.0/account/~/extension/<ext-id>
```
Confirm: status=Enabled, email matches, extension number matches, role assigned.

## Workflow (UI fallback path)
If API is blocked:
1. Navigate Playwright to `https://service.ringcentral.com/` (login as Gautam or Raj — 2FA goes to Raj.bhargava@exulthealthcare.com per `ringcentral.json` notes)
2. Users -> Users With Extensions -> **Add User**
3. Select user type (existing / new), department, extension #
4. Fill email + name, click **Add**
5. Assign role from the role dropdown
6. Click **Send Welcome Email**

## Per-request approval
- Step 4 is the approval gate. Required always. Required TWICE if a new license is being added.
- License cost is NOT auto-approved under any budget.

## Verification
- `GET /account/~/extension/<id>` returns the new user with status=Enabled
- Welcome email is in the user's inbox (confirm with the user, or check sent items)
- If added to queues: queue membership shows up in `GET /call-queues/<id>/members`

## Rollback
- If wrong user was created: `PUT /account/~/extension/<id>` with `status: Disabled` (not delete). See `rc-disable-extension` skill. Full delete is by RC support ticket.
- If welcome email went to wrong address: update email via `PUT /account/~/extension/<id>/contact` and re-send activation link.

## Common pitfalls
- **Seat vs extension**: Adding an extension is cheap; adding a LICENSED seat (new RC user seat) costs $30-50/mo. Know which one you are doing.
- **Email collision**: RC rejects duplicate emails at create time. Check for existing extension with same email first.
- **2FA on login**: The RC developer + admin portal 2FA code goes to Raj's email (Raj.bhargava@exulthealthcare.com). JWT auth avoids this for API calls.
- **Role assignment order**: Some roles can only be set after the user activates. If PUT fails, wait for activation and retry.
- **Extension number conflicts**: Ring group 55 (Front Office) reserves ext 55 — do not assign ext 55 to a user.

## References
- RC API reference: https://developers.ringcentral.com/api-reference/Extensions
- RC KB (user provisioning): https://support.ringcentral.com/article-v2/6018.html
- Credentials: `/Users/agent/pi-mono/.config/exult/ringcentral.json`
- Archive: `/Users/agent/pi-mono/.pi/services/rc_archive/extensions.json`
