---
name: amd-cancel-appointment
description: Cancel an existing AMD appointment with a reason code and optional patient notification
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointments, mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointment, mcp__claude_ai_Keragon__com_keragon_advancedmd_updateAppointment, mcp__claude_ai_Keragon__com_keragon_advancedmd_getReasons, mcp__claude_ai_Keragon__com_keragon_microsoftoutlook_sendMail
---

# amd-cancel-appointment

## Purpose
Cancel a single AdvancedMD appointment without creating a replacement. Sets the appointment to cancelled status via the REST `/scheduler/appointments/{id}/cancel` endpoint and (optionally) sends a cancellation notice to the patient. If the user wants to move the appointment, use `amd-reschedule-appointment` instead.

## Inputs
1. Patient identifier (name + DOB, or chart #)
2. Appointment to cancel (date + provider, or appointmentid)
3. Cancellation reason (patient request / clinic close / provider out / illness / other)
4. Whether to notify the patient (yes / no)
5. Notification channel if yes (email / SMS via RC / both)

## Prerequisites
- AMD API reachable
- Gautam explicit per-request approval (write)
- If notifying: patient email or mobile on file

## Workflow (API path — default)

### Step 1. First question — reschedule or cancel?
Ask Gautam: "Is this a straight cancel, or a reschedule?" If reschedule, hand off to `amd-reschedule-appointment` skill and stop. Otherwise continue.

### Step 2. Locate the patient + appointment
```
findPatient(firstName, lastName, dateOfBirth)
getAppointments(patientId=<id>, startDate=..., endDate=...)
```
Capture the appointmentid and note the date/time/provider/type for the verification + notification step.

### Step 3. Look up the reason code
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_getReasons()
```
Common codes (verify against local list — codes are office-specific):
- Patient cancel / patient request
- Clinic cancel / provider unavailable
- Illness / emergency
- Insurance / billing
- No-show (only if 15+ min late without contact)

Pick the matching code for the stated reason.

### Step 4. PAUSE for approval
Summary (redacted):
```
Cancel visit (NOT reschedule):
- Patient initials: [J.D.]
- Chart last-3: [**456]
- Appt: <date> <time> with <provider>
- Type: <name>
- Reason: <text>
- Notify patient: <yes/no> via <channel>
Confirm to proceed?
```
Wait for explicit "go".

### Step 5. Execute cancel
REST endpoint (per `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Cancel_Appointment.htm`):
```
PUT {{webserverbaseurl}}/{{host}}/{{appname}}/scheduler/appointments/{appointmentId}/cancel
body: {"id": <appointmentId>, "noshowreasonid": "<reason code>"}
```
If the Keragon MCP exposes `updateAppointment` with a status field, that may also work — try REST first since it is the officially documented cancellation endpoint.

### Step 6. Verify
```
getAppointment(appointmentId=<id>)
```
Confirm status is cancelled (status 10 or equivalent per office config). Also confirm the appointment no longer appears in `getAppointments` for the date range (or appears with cancelled status).

### Step 7. Notify patient (if requested)
- Email: use Outlook MCP `sendMail` from api@exulthealthcare.com or practice-info@
- SMS: use RC `sendSms` from main number (469) 714-0006
- Template (no PHI beyond first name):
  ```
  Hi {first_name}, your appointment at Exult Healthcare on {date} at {time} has been cancelled. Please call (469) 714-0006 to reschedule. - Exult Healthcare
  ```
- Do not include diagnosis, reason, or provider name in the message unless Gautam approves

## Per-request approval
- Pause before Step 5. Cancellations affect billing, schedule, and patient trust — never batch.
- Patient notification is a separate approval if the message is customized beyond the template.

## Verification
- `getAppointment` returns cancelled status
- Slot is freed (appears in `getOpenings` for the provider/column/date)
- If notified: SMS/email delivery confirmed (RC log or Outlook sent folder)

## Rollback
- AMD cancel is reversible for a short window via `updateAppointment` setting status back to Active (or 0). If more than a few minutes have passed or a new appointment has been booked in the slot, rebook a new appointment instead.
- If wrong patient was cancelled: immediately recreate using `createAppointment` with the captured payload from Step 2.
- If patient was notified in error: send a follow-up "please disregard previous message" from the same channel.

## Common pitfalls
- **Wrong reason code**: Using "no-show" when patient actively cancelled tanks their cancel-rate stats and can affect re-booking policies. Pick carefully.
- **Missing noshowreasonid**: AMD may accept the request but produce a blank cancellation reason in reports. Always pass a code.
- **Cancelling within cancellation window**: Exult may charge a fee for late cancels — Gautam will tell you if a fee applies. Do NOT auto-post the fee, that is a separate workflow.
- **Timezone**: `getAppointments` returns office-local times (America/Chicago). A patient calling at 8am CT asking about "my 9am appointment" means 9am local, not UTC.
- **Same-day cancel with posted charges**: If the visit has already been posted/checked in, cancellation is not allowed via API. Redirect to the visit-void / charge-reversal workflow manually.

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Cancel_Appointment.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Confirm_Appointment_Not_Booked.htm`
- Memory: `feedback_amd_writes.md`, `reference_amd_api.md`
