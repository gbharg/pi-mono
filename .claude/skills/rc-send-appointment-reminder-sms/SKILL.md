---
name: rc-send-appointment-reminder-sms
description: Send a templated appointment reminder SMS from the Exult main line to a patient (HIPAA-BAA covered, TCPA compliant)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_ringcentral_sendSms, mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointment, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientDemographic
---

# rc-send-appointment-reminder-sms

## Purpose
Send a templated appointment reminder SMS from the Exult Healthcare main line (469) 714-0006 to a patient mobile phone, tied to an AdvancedMD appointment. Used for 48-hour and 24-hour reminders. RingCentral BAA is already signed (see memory `feedback_rc_hipaa_baa.md` if present) so we may include minimal PHI (first name + appointment time + provider) but must include TCPA opt-out language on every message.

## Inputs
1. Patient mobile phone (E.164 `+1NXXXXXXXXX` format required)
2. Patient first name (SMS-friendly, no last name to limit PHI)
3. Appointment datetime (local America/Chicago, display in patient-readable format)
4. Provider name or title (e.g., "Dr. Shaye" or "your provider")
5. Template variant: `REMIND_48` / `REMIND_24` / `REMIND_2H` / `CONFIRM_REQUEST`
6. Confirmation phrase (default `YES` to confirm, `RESCHED` to reschedule, `STOP` to opt out)

## Prerequisites
- RC JWT creds at `/Users/agent/pi-mono/.config/exult/ringcentral.json` with `SMS` scope
- The sending extension MUST have SMS enabled. Main line ext 101 (or the direct 469-714-0006 DID) is preferred. If using a queue-only extension, SMS will fail silently.
- Patient has consented to SMS communication (check AMD `getPatientPreferences` for `smsconsent=1`)
- Patient mobile is not in the RC SMS opt-out list (RC tracks `STOP` replies automatically)
- Gautam explicit per-request approval (patient communication)
- TCPA-compliant message template (opt-out language included)

## Templates (TCPA compliant)
All templates <= 160 chars to avoid multi-segment billing. Include `Reply STOP to opt out.`

### REMIND_48
```
Exult Healthcare: Hi <FirstName>, reminder of your appt with <Provider> on <DayDate> at <Time>. Reply YES to confirm, RESCHED to reschedule. Reply STOP to opt out.
```

### REMIND_24
```
Exult Healthcare: Hi <FirstName>, your appt with <Provider> is tomorrow <DayDate> <Time>. Arrive 10 min early. Reply YES to confirm or STOP to opt out.
```

### REMIND_2H
```
Exult Healthcare: <FirstName>, your appt with <Provider> is at <Time> today. 4001 Medical Center Dr McKinney TX. Reply STOP to opt out.
```

### CONFIRM_REQUEST
```
Exult Healthcare: Hi <FirstName>, please confirm your <DayDate> <Time> appt with <Provider>. Reply YES, NO, or RESCHED. Reply STOP to opt out.
```

## Workflow (API path - default)

### Step 1. Pull appointment details (if AMD-linked)
If caller provides an AMD appointment ID, look it up first:
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointment(appointmentId=<id>)
```
Extract: patient first name, provider, starttime (convert to America/Chicago), reason (for context only, do not put in SMS).

### Step 2. Check SMS consent
```
getPatientPreferences(patientId=<id>)
```
Confirm `smsconsent=1` (or equivalent field - exact attribute name varies by AMD version; verify in UI first). If not consented, ABORT and escalate to Gautam. Cannot send SMS to non-consenting patients without TCPA liability.

### Step 3. Format the message
Substitute template variables:
- `<FirstName>`: patient first name, title case, max 15 chars
- `<Provider>`: "Dr. Shaye" (default attending) or specific
- `<DayDate>`: "Wed 4/15"
- `<Time>`: "10:30 AM"

Enforce length <= 160 chars. If over, abbreviate provider ("Dr. S") or time ("10:30a"). Never drop the STOP language.

### Step 4. PAUSE for approval
Summary (redacted):
```
SMS REMINDER:
- From: (469) 714-0006
- To: (***) ***-<last-4>
- Patient initials: [J.S.]
- Template: REMIND_24
- Message (literal): "Exult Healthcare: Hi Jane, your appt with Dr. Shaye is tomorrow Wed 4/15 10:30 AM. Arrive 10 min early. Reply YES to confirm or STOP to opt out."
- Length: 157 chars
Confirm to send?
```
Wait for explicit "go".

### Step 5. Send via RingCentral SMS
Keragon MCP:
```
mcp__claude_ai_Keragon__com_keragon_ringcentral_sendSms(
  from="+14697140006",
  to=["+1<patientmobile>"],
  text="<formatted message>"
)
```
Raw REST equivalent:
```
POST /restapi/v1.0/account/~/extension/{extensionId}/sms
{
  "from": {"phoneNumber": "+14697140006"},
  "to":   [{"phoneNumber": "+1<patientmobile>"}],
  "text": "<formatted message>"
}
```
Extension ID for the main line: verify via `GET /account/~/extension?status=Enabled&type=User` - looking for the ext that owns the 4697140006 DID.

### Step 6. Verify delivery
- Capture the returned `messageStatus` and `id`. Values: `Queued` / `Sent` / `Delivered` / `SendingFailed` / `DeliveryFailed`.
- For 15-30 seconds after send, poll `GET /account/~/extension/{extId}/message-store/{messageId}` to confirm transition to `Delivered`.
- If `SendingFailed`: check for opt-out (most common), invalid number, or carrier reject. Do NOT auto-retry.

### Step 7. Log to audit
Append to `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`:
```
SMS REMINDER | yyyy-mm-dd hh:mm | initials=J.S. last-4=1234 | template=REMIND_24 | appt=<id> | msgid=<id> | status=Delivered
```

## Per-request approval
REQUIRED per message. No batching across multiple patients without Gautam explicit bulk approval. Include:
- Literal message body (not just template name)
- Recipient last-4
- Patient initials
- Template variant

For bulk reminder runs (e.g., "send 24h reminders to all tomorrow appointments"), Gautam approval covers the full list as long as every message uses the same template and each patient is enumerated in the approval summary (initials + last-4).

## Verification
- `messageStatus=Delivered` within 60 seconds, OR
- `messageStatus=Sent` within 60 seconds and Delivered within 5 min
- Audit log entry written
- No `SendingFailed` or `DeliveryFailed`

## Rollback
- SMS cannot be unsent. If wrong info in message, send a corrective follow-up: `Exult Healthcare: Correction to prev msg - your appt is actually <correct time>. Reply STOP to opt out.`
- If sent to wrong number: STOP. This may be a HIPAA incident depending on content. Notify Gautam immediately.
- If the patient replies STOP: RC handles automatically, number is added to opt-out list, no further SMS will send.

## Common pitfalls
- **E.164 format mandatory**: `(469) 714-0006` is NOT accepted by the API. Must be `+14697140006`.
- **Sending extension lacks SMS**: Queue extensions (ext 881804009 queue 55) cannot send SMS. Use the main user extension that owns the DID.
- **Multi-segment billing**: Messages > 160 chars split into segments. Each billed separately. Keep it under 160.
- **Emoji in SMS**: Forces UCS-2 encoding, cuts max length to 70 chars. Avoid.
- **Markdown in body**: SMS renders plain. `**bold**` shows as literal asterisks. Avoid.
- **TCPA opt-out missing**: FCC requires STOP language on every promotional / reminder message. Don't skip it even on confirmation replies.
- **PHI in message**: Full name + DOB + diagnosis = too much. First name + appointment time + provider is the safe envelope under the RC BAA.
- **Last name in message**: Do NOT include last name. Even with BAA, minimize PHI exposure to what is functionally necessary.
- **Reminder fatigue**: Two reminders for the same appointment is fine. Three is annoying. Four is a TCPA complaint. Cap at REMIND_48 + REMIND_24.
- **SMS cost**: RC charges per segment. A 200-patient reminder run costs real money. Gautam approves the list.

## References
- Local RC docs (if downloaded): `/Users/agent/pi-mono/.pi/services/rc/` (TODO: verify path)
- RC SMS endpoint: https://developers.ringcentral.com/api-reference/SMS/createSMSMessage
- RC Detailed API: https://developers.ringcentral.com/api-reference
- Memory: `reference_rc_phone_routing.md`, `feedback_rc_hipaa_baa.md` (if present)
- TCPA: 47 CFR 64.1200
- JWT creds: `/Users/agent/pi-mono/.config/exult/ringcentral.json`
- Audit log: `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`
