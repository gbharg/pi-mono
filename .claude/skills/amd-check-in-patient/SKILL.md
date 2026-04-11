---
name: amd-check-in-patient
description: Mark a patient as arrived for today visit in AdvancedMD, optionally collect copay and generate ROI form
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointments, mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointment, mcp__claude_ai_Keragon__com_keragon_advancedmd_updateAppointment, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientTransactionHistory, mcp__claude_ai_Keragon__com_keragon_advancedmd_applyPaymentToCharge, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_snapshot
---

# amd-check-in-patient

## Purpose
Check in an arriving patient for their scheduled appointment at Exult Healthcare (office 161112): find today visit, flip the appointment status to "Arrived", optionally collect the copay (chain to `amd-process-payment`), and generate an ROI intake form if the patient is new. Covers the front-desk morning workflow.

## Inputs
1. Patient identifier (name or chart #)
2. Expected appointment time (morning, 2pm, etc. - optional, helps disambiguate if patient has multiple same-day visits)
3. Copay amount (optional - if Gautam knows it from yesterday eligibility check)
4. New patient flag (yes/no - triggers ROI form)
5. Arrival time (default now)

## Prerequisites
- AMD service account ARC022825 creds at `/Users/agent/.config/exult/admin-credentials.json`
- Keragon MCP `updateAppointment` reachable OR XMLRPC `updateappointment`
- Patient must have an appointment on today date
- If collecting copay: chain approval per `amd-process-payment`
- Gautam explicit approval for check-in (quick yes), and a SEPARATE approval for copay collection

## Workflow (API path - default)

### Step 1. Find today appointment(s)
```
findPatient(firstName, lastName, dateOfBirth)   # or getPatient(patientId)
getAppointments(patientId=<id>, startDate="<today>", endDate="<today>")
```
Filter to status codes where the patient has not yet been marked arrived. AMD appointment status codes (per `Content_Get_Appointments.htm` + office config):
- `0` = Scheduled / Pending
- `1` = Arrived / Checked In
- `2` = In Room / Ready for Provider
- `3` = With Provider
- `4` = Checkout
- `5` = Done / Discharged
- `6` = No Show
- `7` = Cancelled

If the patient has >1 visit today (rare), prompt Gautam to pick which one.

### Step 2. Capture appointment details
```
getAppointment(appointmentId=<id>)
```
Capture `appointmentid`, `starttime`, `providerid`, `reasonid`, `episodeid`, current `status`.

If current `status != 0`, STOP. Don't re-arrive someone who is already in room or done.

### Step 3. PAUSE for quick approval
Summary:
```
CHECK IN:
- Patient initials: [J.D.]
- Appt: [10:30 AM with Dr. Shaye, 99213 follow-up]
- Current status: Scheduled (0)
- New status: Arrived (1)
- New patient: [YES / NO]
- Copay to collect: [$30 / NONE]
Confirm?
```
A quick "yes" is sufficient for the status flip; copay is a separate approval in Step 5.

### Step 4. Flip the appointment status
Keragon MCP:
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_updateAppointment(
  appointmentId=<id>,
  status=1,
  arrivedTime="<HH:MM>"
)
```
XMLRPC fallback: `updateappointment` with `@status="1"` and `@arrivaltime="<hh:mm AM/PM>"`. Refer to `Content_Cancel_Appointment.htm` and the appointment update section of `Content_Get_Appointments.htm` for exact XML payload shape.

### Step 5. Branch - collect copay (if applicable)
If copay > $0:
1. STOP and CHAIN to `amd-process-payment` with amount = copay, paycode=PP, paymethod from the actual transaction
2. That skill has its own per-request approval gate - do NOT bypass it
3. Card must have been charged on the terminal first; this skill does not run the card
4. After posting, return here to continue

If copay = $0 (Medicare PT + no coinsurance, or already-paid-on-card-file), skip to Step 6.

### Step 6. Branch - new-patient ROI form
If new patient:
1. Print the Exult ROI + HIPAA + financial responsibility packet (template lives in SharePoint: `Clinic Ops / Intake Forms / ROI Packet 2026.pdf`)
2. Hand packet to patient on clipboard
3. After patient signs, chain to `amd-upload-document` with doc type = `ROI` to attach the scanned signed copy to the chart (separate approval)
4. Also chain `amd-upload-document` for ID front, ID back, insurance card front, insurance card back

### Step 7. Notify the back office
Optional: send a brief Teams / iMessage ping to Dr. Shaye clinical device: `Patient [initials] arrived, in waiting room, ready for intake at [time]`.

### Step 8. Verify
```
getAppointment(appointmentId=<id>)
```
Confirm `status=1` and `arrivaltime` populated.

## Workflow (UI fallback path)
1. Playwright nav to `https://login.advancedmd.com/practicemanager/` -> **Scheduler**
2. Navigate to today date, find the appointment row
3. Right-click -> **Appointment Status** -> **Arrived**
4. If copay: open the **Payment Entry** quick-action from the appointment row
5. Screenshot the scheduler with the row now color-coded Arrived

## Per-request approval
- Status flip (Scheduled -> Arrived): quick single approval OK
- Copay collection: REQUIRED separate approval per `amd-process-payment` (financial write)
- ROI document upload: REQUIRED separate approval per `amd-upload-document` (PHI write)
- Do NOT chain all three behind a single "yes". Gautam approves each gate.

## Verification
- `getAppointment` returns `status=1`, `arrivaltime` set
- If copay posted: `getPatientTransactionHistory` shows new PP line, balance reduced
- If ROI uploaded: doc shows in chart files list

## Rollback
- Wrong patient flipped to Arrived: call `updateAppointment` with `status=0` to revert to Scheduled. Safe.
- Wrong copay posted: see `amd-process-payment` rollback (UI void)
- Wrong doc uploaded: see `amd-upload-document` rollback (cannot auto-delete; mark archived + note in chart)

## Common pitfalls
- **Multiple same-day visits**: A patient can have a therapy visit AM and a med-management PM. Don't guess; ask Gautam.
- **Status already advanced**: If provider clinical staff already marked In Room, don't regress to Arrived. Leave status as-is and note arrival-time-unknown.
- **No appointment on today date**: The patient showed up on the wrong day, or was never scheduled. Don't create a walk-in appointment in this skill; escalate to Gautam.
- **Copay not paid at check-in**: Exult policy is "pay at check-in or reschedule". If patient cannot pay, get Gautam decision before flipping Arrived status.
- **ROI already on file**: Returning patients don't need a new ROI every visit. Check chart files first before printing.
- **Arrival time precision**: AMD stores arrival time in 5-minute buckets. Don't spend effort on exact second-level accuracy.
- **No `deleteappointment` = ghost arrivals**: If you incorrectly flip Arrived and then want to reset, you MUST use `updateAppointment status=0`. Cancelling is not the same as reverting.

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_Appointments.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Cancel_Appointment.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Hard_Coded_Values.htm` (status codes)
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_newappointment.htm`
- Related skill: `amd-process-payment`
- Related skill: `amd-upload-document`
- Memory: `feedback_amd_writes.md`, `reference_amd_api.md`
