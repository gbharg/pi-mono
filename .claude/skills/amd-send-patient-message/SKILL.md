---
name: amd-send-patient-message
description: Send a secure message to a patient via AdvancedMD Patient Portal or fallback to Microsoft 365 email
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientDemographic, mcp__claude_ai_Keragon__com_keragon_microsoftoutlook_createDraftMail, mcp__claude_ai_Keragon__com_keragon_microsoftoutlook_sendMail, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_snapshot
---

# amd-send-patient-message

## Purpose
Send a secure message to a patient via the AdvancedMD Patient Portal (preferred, HIPAA-compliant) or fallback to a direct Microsoft 365 Outlook email (only if the patient has no portal account and has a consented email on file). This is patient communication containing PHI and requires per-request Gautam approval for every message.

## Inputs
1. Patient identifier (chart # or patientid)
2. Subject line
3. Body text (plain text, no markdown - portal strips formatting)
4. Optional: attachment file paths (portal supports file attachments; Outlook does too)
5. Delivery channel hint: `portal` (default) / `email` (fallback only)
6. Urgency: normal / high (high surfaces a red banner in the portal)

## Prerequisites
- AMD service account ARC022825 creds at `/Users/agent/.config/exult/admin-credentials.json`
- Patient Portal account exists for the patient (check via `lookuppatientportalaccount`). If not, use `Content_Send_Patient_Portal_Account_Invite.htm` flow first, or fall back to email
- Patient has an email address on file AND has signed consent for electronic communication (check `patientpreferences` for `econsent=1`)
- Gautam explicit per-request approval (PHI, patient communication)
- `feedback_no_searchparty.md`: NEVER use `gautam@searchparty.me` as a reply-to or from address

## Workflow (Portal path - default, preferred)

### Step 1. Look up the patient portal account
XMLRPC per `Content_Patient_Portal_Account.htm`:
```json
{
  "ppmdmsg": {
    "@action": "lookuppatientportalaccount",
    "@class": "lookup",
    "@msgtime": "<mm/dd/yyyy hh:mm:ss AM/PM>",
    "@exactmatch": "1",
    "@fullname": "LASTNAME,FIRSTNAME",
    "@orderby": "fullname",
    "@page": "1"
  }
}
```
Returns `patientportalaccount` rows with `id` and `emailaddress`. Cache the portal `id`.

If no portal account exists:
- Option A: invite them (per `Content_Send_Patient_Portal_Account_Invite.htm`, action `sendinvitation`). This is a separate write with its own approval - ask Gautam whether to invite now or fall back to email
- Option B: fall back to Outlook email (see below)

### Step 2. Compose the message
TODO: verify the exact AMD API action for posting a message to a patient portal. `Content_Posting_Messages.htm` documents the generic xmlrpc transport but NOT a concrete `sendportalmessage` action. Candidates to verify with Gautam / AMD support:
- `sendportalmessage` (class `patientportal`)
- `savemessage` (class `message`)
- `addmessage` (class `message`)

Until verified, **prefer the UI fallback** for portal messaging. Do not fabricate a non-existent action - this is exactly the failure mode called out in memory `feedback_verify_agent_claims.md`.

### Step 3. PAUSE for approval
Present (redacted):
```
SEND PATIENT MESSAGE:
- Channel: PORTAL (or EMAIL fallback)
- Patient initials: [J.D.]
- Chart last-3: [**456]
- Portal email domain: [@gmail.com] (do not log full address)
- Subject: [Your 4/15 appointment reminder]
- Body preview (first 120 chars): "..."
- Attachments: [0 files / 1 PDF "visit-summary-2026-04-10.pdf"]
- Urgency: NORMAL
Confirm to send?
```
Wait for explicit "go".

### Step 4. Post the message via API (when verified) or UI fallback
**UI fallback (current recommended path until API action verified):**
1. Playwright nav to `https://login.advancedmd.com/practicemanager/`
2. Open patient chart -> **Portal** tab -> **New Message**
3. Pick subject, paste body, attach files, set urgency, click **Send**
4. Screenshot the sent-messages list showing the new row

### Step 5. Verify delivery
- Portal: `getPortalMessages(patientId=<id>)` or UI readback of the Sent folder
- Email: Outlook Sent folder contains the draft, timestamp matches

## Workflow (Email fallback path)
Use ONLY when:
- Patient has no portal account AND we are not inviting them now
- Patient has a consented email on file (`getPatientPreferences` confirms `econsent=1`)
- Gautam has approved "email instead of portal" explicitly

### Step 1. Compose via Outlook MCP
```
mcp__claude_ai_Keragon__com_keragon_microsoftoutlook_createDraftMail(
  to=["<patient_email>"],
  subject="<subject>",
  body="<plain text body>",
  attachments=[...]
)
```
Use `createDraftMail` first, NOT `sendMail`. The draft lets Gautam review before actually sending.

### Step 2. PAUSE for approval (draft review)
Present to Gautam: draft ID + recipient domain (redacted) + subject + body preview. Gautam opens the draft in Outlook, reviews, clicks Send themselves. Or Gautam explicitly approves auto-send.

### Step 3. Send (if auto-send approved)
```
mcp__claude_ai_Keragon__com_keragon_microsoftoutlook_sendMail(
  draftId=<id>
)
```

### Step 4. Email disclaimer rule
Every email fallback MUST include this footer (HIPAA email-consent boilerplate):
```
---
This message contains confidential health information from Exult Healthcare PLLC. If you are not the intended recipient, please delete this email and notify us at (469) 714-0006.

Exult Healthcare PLLC | McKinney, TX | (469) 714-0006
```

## Per-request approval
REQUIRED. Every single patient message. Approval must include both the channel choice (portal vs email) and the body content. Do NOT batch.

## Verification
- Portal: message row visible in sent folder, recipient matches
- Email: Outlook Sent folder contains the message, recipient domain matches intent
- Patient initials + chart last-3 + message ID logged to audit file
- Do NOT claim "sent" without reading back the sent folder (memory `feedback_verify_agent_claims.md`)

## Rollback
- Portal: AMD does not support message recall. If wrong content, send a follow-up message "Please disregard my previous message. Correct info below." and notify Gautam.
- Email: Outlook "Recall This Message" only works if recipient is also on the same tenant (not the case for patients). Follow-up apology email is the only option.
- Wrong patient: PRIVACY INCIDENT. Stop. Notify Gautam. Potential HIPAA breach analysis may apply.

## Common pitfalls
- **No econsent on file**: Sending a plain-text email to an unconsented patient is an HIPAA violation. Check `getPatientPreferences` before email fallback.
- **Email address from an old record**: Patients change emails often. Confirm the address is current before fallback.
- **Portal account expired / disabled**: `lookuppatientportalaccount` may return an account with `disable=1`. Don't send to disabled accounts; they don't get notified.
- **Markdown in body**: Portal renders plain text only. Markdown shows up as literal `**bold**` characters. Use plain text.
- **Attachment size**: Portal has a per-attachment limit (~5 MB). Use `amd-upload-document` for large files and reference the file by name in the message body.
- **Reply-to confusion**: Portal replies come back in-portal and need daily triage. Email replies hit `info@exulthealthcare.com` and need Outlook triage. Set expectations with the patient.
- **PHI in subject line**: Subject is visible in notification previews (lock screen, inbox list). Keep PHI out of the subject. "Your appointment" is fine; "Your HIV lab results" is not.
- **Unverified API action**: As of this writing, the exact AMD action name for posting a portal message is not confirmed in the local docs. Do not guess. Use UI fallback until verified.

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Patient_Portal_Account.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Send_Patient_Portal_Account_Invite.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_List_of_Patient_Portal_Accounts.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_Patient_Portal_Account.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Posting_Messages.htm` (generic xmlrpc transport, not the specific portal-message action)
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Lookup_Patient_Portal_Account.htm`
- Memory: `feedback_amd_writes.md`, `feedback_verify_agent_claims.md`, `feedback_no_searchparty.md`, `reference_m365_app_scopes.md`
- TODO: verify the exact portal-message POST action with AMD support or via UI network traffic capture
