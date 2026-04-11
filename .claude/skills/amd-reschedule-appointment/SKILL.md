---
name: amd-reschedule-appointment
description: Move an existing AMD appointment to a new date/time, preserving episode/provider/type
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointments, mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointment, mcp__claude_ai_Keragon__com_keragon_advancedmd_getOpenings, mcp__claude_ai_Keragon__com_keragon_advancedmd_createAppointment, mcp__claude_ai_Keragon__com_keragon_advancedmd_updateAppointment, mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointmentTypes, mcp__plugin_playwright_playwright__browser_navigate
---

# amd-reschedule-appointment

## Purpose
Move an existing AdvancedMD appointment to a new slot. Follows the documented DELETE-then-POST pattern (per memory `feedback_amd_writes.md`): cancel the existing visit, then create a new one with the same episode / provider / appointment type at the new time. This preserves authorization and referral linkage.

## Inputs
1. Patient identifier (name + DOB, OR chart #, OR patientid)
2. Current appointment identifier (appointmentid if known, otherwise date + provider to look up)
3. Desired new date + time window (e.g., "next Tuesday between 9am and noon")
4. New provider (if changing provider) — usually same provider
5. Reason for reschedule (patient request / clinic close / provider unavailable)
6. Whether to notify patient (via AMD Patient Messaging, separate workflow)

## Prerequisites
- AMD API reachable (Keragon MCP `createAppointment` / `updateAppointment` / REST cancel endpoint)
- Gautam explicit per-request approval for the write (memory `feedback_amd_writes.md`)
- Target provider column must be set up in AMD Scheduler setup (`getSchedulerSetupColumns`)

## Workflow (API path — default)

### Step 1. Locate the patient
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient(
  firstName="...", lastName="...", dateOfBirth="YYYY-MM-DD"
)
```
Capture `patientid` and `chartnumber`. Never log the full name — use initials when echoing.

### Step 2. Locate the existing appointment
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointments(
  patientId=<patientid>,
  startDate="YYYY-MM-DD",
  endDate="YYYY-MM-DD"
)
```
Find the matching appointment by date. Capture:
- `id` (appointmentid)
- `columnid`, `profileid`, `facilityid`
- `episodeid`, `referralplanid`
- `appointmenttypeids[]`
- `duration`, `color`, `instruction[]`
- `transitionofcare`, `istelemedicine`

### Step 3. Find new openings
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_getOpenings(
  providerId=<profileid from step 2>,
  startDate="YYYY-MM-DD",
  endDate="YYYY-MM-DD",
  duration=<same as step 2>
)
```
Present available slots to Gautam. Ask which one to take.

### Step 4. PAUSE for approval
Summary (redacted):
```
Reschedule visit:
- Patient initials: [J.D.]
- Chart last-3: [**456]
- Appt ID: <id>
- From: <old date/time>
- To:   <new date/time>
- Provider: <name>
- Type: <name>
Confirm to proceed with DELETE + CREATE?
```
Wait for explicit "go".

### Step 5. Cancel the existing appointment
Use REST endpoint documented at `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Cancel_Appointment.htm`:
```
PUT {{webserverbaseurl}}/{{host}}/{{appname}}/scheduler/appointments/{appointmentId}/cancel
body: {"id": <appointmentId>, "noshowreasonid": "<reason code>"}
```
Reason codes: 23=patient no-show, use a reschedule-specific code if available (check `getReasons`).

### Step 6. Create the replacement
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_createAppointment(
  patientId=<patientid>,
  columnId=<same as step 2>,
  startDateTime="YYYY-MM-DDTHH:MM",
  duration=<same>,
  profileId=<same>,
  episodeId=<same>,
  appointmentTypeId=<same>,
  facilityId=<same>,
  referralPlanId=<same from step 2>,
  transitionOfCare=<same>,
  isTelemedicine=<same>
)
```
Capture the new `id`.

### Step 7. Verify + respond
Call `getAppointment(appointmentId=<new id>)`. Confirm:
- `startdatetime` matches request
- `patientid` matches
- `status` != cancelled
- Old appointmentid is cancelled (status 10 or not found)

Tell Gautam: "Rescheduled [initials] from [old] to [new], new appt id [id]."

## Per-request approval
- Pause before Step 5 (cancel) AND before Step 6 (create). Treat as one approval gate covering both — do not proceed past Step 4 without explicit sign-off.
- If reschedule fails between cancel and create (step 5 succeeded, step 6 failed), STOP and alert Gautam immediately. Do NOT retry without approval. Rollback: re-create at the old time using captured data from Step 2.

## Verification
- New appointment visible in `getAppointments` for the patient
- Old appointment status is cancelled
- Episode linkage preserved (same episodeid)
- Referral plan linkage preserved (same referralplanid)

## Rollback
- If new-create fails: re-create the original appointment with the Step 2 payload at the original time. Restore `referralplanid` + `episodeid` exactly.
- If the patient no longer wants the appointment: leave cancelled, do not re-create.
- Document the rollback in the AMD appointment comment field: "RESCHEDULE FAILED - RESTORED <date>"

## Common pitfalls
- **Lost referral linkage**: Forgetting `referralplanid` on the new create will break claim billing. Always copy it from the original.
- **Episode mismatch**: New appt with a different `episodeid` creates a new episode unexpectedly. Always reuse.
- **Column vs profile**: `columnid` is the scheduler column (physical slot), `profileid` is the billing provider. Both must match unless intentionally changing.
- **Telemedicine flag**: Must match the original unless patient is switching modality. Missing flag silently creates an in-office visit.
- **409 Conflict**: Overlap with existing block/appointment. Call `getOpenings` again for a clean slot.
- **AMD timezone**: All times are office-local (America/Chicago for McKinney TX). Do NOT send UTC.

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_newappointment.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Cancel_Appointment.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_Appointments.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Columns_Openings.htm`
- Memory: `feedback_amd_writes.md`, `reference_amd_api.md`
