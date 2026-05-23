---
name: exult-daily-kpi-report
description: Compose the Exult morning KPI report (call log, voicemails, today appointments, new patients, AR, collections, referrals) as plain text for iMessage
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_ringcentral_getCompanyCallRecords, mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointments, mcp__claude_ai_Keragon__com_keragon_advancedmd_getNewAndModifiedPatients, mcp__claude_ai_Keragon__com_keragon_advancedmd_getNewAndModifiedVisits, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientTransactionHistory, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatients
---

# exult-daily-kpi-report

## Purpose
Compose a composite morning KPI report for Gautam at Exult Healthcare (office 161112) covering the 8 daily metrics the front office tracks. Output is plain text optimized for iMessage (no markdown, ALL-CAPS section headers, numbered lists). READ-ONLY across all data sources: no writes to AMD, no writes to RC, no per-request approval required. Safe to schedule as a recurring cron / launchd job for 8:00 AM CT daily.

## Inputs
1. Report date (default: today)
2. Comparison window (default: yesterday + last 7-day rolling average)
3. Delivery target (default: iMessage Gautam +19723637754 via sendblue-channel)
4. Optional flags: `--verbose` (include per-patient detail), `--skip-phones` (if RC API is down)

## Metrics covered
1. Phone: inbound / outbound / missed call counts + voicemail count (since last report)
2. Voicemails: count + top 3 callers (callback queue)
3. Appointments today: count + by-provider breakdown + any unassigned slots
4. New patients: count added in last 24h
5. Outstanding AR: current / 30 / 60 / 90 / 120+ buckets (practice-wide total)
6. Yesterday collections: total posted payments by code (PP / PI / copay)
7. Open referrals: inbound pending + outbound pending
8. Staffing snapshot: Shaye schedule load for today (booked vs open)

## Prerequisites
- AMD service account ARC022825 creds at `/Users/agent/.config/exult/admin-credentials.json`
- RC JWT creds at `/Users/agent/pi-mono/.config/exult/ringcentral.json` with `ReadCallLog` scope
- Keragon MCP tools reachable (or XMLRPC fallback via `amd_xmlrpc_client.py`)
- iMessage / Sendblue channel reachable (or fallback to write to `/tmp/kpi-<date>.txt`)
- No Gautam approval required: read-only aggregate

## Workflow (API path - default)

### Step 1. Pull phone stats (last 24h)
```
mcp__claude_ai_Keragon__com_keragon_ringcentral_getCompanyCallRecords(
  dateFrom="<yesterday 00:00 CT>",
  dateTo="<today 00:00 CT>",
  view="Detailed",
  perPage=250
)
```
Paginate if needed. Aggregate:
- `inbound_total` (direction=Inbound)
- `outbound_total` (direction=Outbound)
- `missed_total` (result=Missed)
- `voicemail_total` (result=Voicemail)
- `avg_ring_seconds`

### Step 2. Pull voicemails
```
GET /restapi/v1.0/account/~/extension/<vmExtId>/message-store?messageType=VoiceMail&dateFrom=<yesterday>
```
Extract top 3 unheard voicemails by timestamp. Capture caller phone (mask middle digits) + duration + time.

### Step 3. Pull today appointments
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_getAppointments(
  startDate="<today>",
  endDate="<today>"
)
```
Aggregate:
- `total` count
- by-provider map: `{"Dr. Shaye": N, "other": M}`
- `unassigned_slots` count (openings still available per `getOpenings`)
- `status_breakdown`: scheduled / arrived / no-show / cancelled (early read)

### Step 4. Pull new patients (last 24h)
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_getNewAndModifiedPatients(
  since="<yesterday 00:00>"
)
```
Filter to genuinely new (not modified). Count. Do NOT include names in the report - just the count.

### Step 5. Pull outstanding AR (practice-wide)
Use `getPatientTransactionHistory` aggregated via a worklist / report query OR XMLRPC `getworklisttotals` per `Content_getworklisttotals.htm`. Extract bucket totals:
- current (0-30)
- 31-60
- 61-90
- 91-120
- 120+
- total

TODO: verify the exact XMLRPC action for practice-wide AR aging. The AMD web report "AR Aging" is the same data - if the API path is ambiguous, use the UI export fallback and cache yesterday result.

### Step 6. Pull yesterday collections
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_getPaymentsByCode(
  dateFrom="<yesterday>",
  dateTo="<yesterday>"
)
```
Aggregate by paycode:
- PP (patient payment): $total
- PI (insurance payment): $total
- Copays (subset of PP): $total
- Refunds (negative PP): $total

### Step 7. Pull open referrals
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_getReferralStatuses()
```
Count `status=Open` inbound vs outbound referrals. If the Keragon MCP path is not available, fall back to `Content_Get_List_of_Documents.htm` with doc type filter = REFERRAL.

### Step 8. Staffing / load snapshot
From the appointment pull in Step 3, compute:
- `shaye_load_today`: booked slots / total slots for the day
- `next_open_new_patient_slot`: earliest available intake (90791) on the calendar

### Step 9. Format the iMessage-safe report
Plain text. ALL-CAPS section headers. Numbered lists. NO markdown. <= 2000 chars per message (iMessage auto-collapses longer into "Read More"). Template:

```
EXULT MORNING REPORT - <Weekday Month Day, Year>

PHONE (last 24h)
1. Inbound: <N>
2. Outbound: <N>
3. Missed: <N>
4. Voicemails: <N>
Top VM callbacks: (***) ***-<last4> @ <time>, (***) ***-<last4> @ <time>, (***) ***-<last4> @ <time>

APPOINTMENTS TODAY
1. Total: <N>
2. Dr. Shaye: <N>
3. Unassigned open slots: <N>
4. Next new-patient opening: <date + time>

NEW PATIENTS (last 24h)
1. Added: <N>

AR AGING (practice-wide)
1. Current: $<amt>
2. 31-60: $<amt>
3. 61-90: $<amt>
4. 91-120: $<amt>
5. 120+: $<amt>
6. Total AR: $<amt>

YESTERDAY COLLECTIONS
1. Patient payments (PP): $<amt>
2. Insurance payments (PI): $<amt>
3. Copays: $<amt>
4. Refunds: $<amt>

OPEN REFERRALS
1. Inbound pending: <N>
2. Outbound pending: <N>

STAFFING LOAD
1. Shaye booked: <pct>% of slots
2. Lunch coverage: [OK / GAP at 12-1pm]

Report generated <time CT> by exult-daily-kpi-report skill.
```

### Step 10. Deliver
- Default: send via sendblue-channel iMessage to Gautam +19723637754
- Save a copy to `/Users/agent/pi-mono/.pi/services/reports/kpi-<yyyymmdd>.txt`
- Commit the report copy to git (main branch) for historical archive

### Step 11. Handle failures gracefully
- If RC API down: omit PHONE section, label `PHONE: unavailable (RC API down)`
- If AMD API down: omit the AMD sections, label `AMD: unavailable`
- Never crash mid-report. Partial is better than nothing.
- If more than half the sections fail, escalate to Gautam via a text alert rather than the normal report.

## Per-request approval
NOT required. This is a read-only aggregate report with no PHI in the output (patient counts only, no names; caller numbers masked to last-4). Safe to schedule as a recurring launchd job.

## Verification
- Report file written to `/tmp/kpi-<date>.txt` AND `/Users/agent/pi-mono/.pi/services/reports/kpi-<date>.txt`
- iMessage delivery confirmation from sendblue-channel
- All 8 sections present (or explicitly labeled unavailable)
- Total character count under ~2000 (else split)

## Rollback
N/A - read-only. If a bad report was sent, send a follow-up correction message.

## Common pitfalls
- **PHI leakage**: Never include patient names, DOBs, or chart numbers in the report body. Counts only. Caller phones must be masked to last-4.
- **Time zone drift**: AMD server may return UTC; RC returns ISO-with-offset. Always convert to America/Chicago before rendering times.
- **Market-wide vs office-specific**: Exult has only one office (161112) but AMD API can return cross-office data if the account scope is wrong. Filter explicitly by office.
- **Markdown sneaking in**: The report must be plain text. No `**bold**`, no `# headers`, no backticks. iMessage renders these literally.
- **AR bucket math mismatch**: AMD AR aging as of end-of-prior-day may differ from live-pull. Be consistent: always pull "as of yesterday EOD" for stable comparisons.
- **Cost of polling**: Running this every hour wastes API quota. Daily at 8:00 AM CT is the right cadence. Allow on-demand manual trigger.
- **RC call log lag**: Call records may not appear in the detailed log for 5-10 minutes after the call ends. Don run the report at 7:55 for a 24h window ending 8:00 - pull the window ending 00:00.
- **Empty day = weird numbers**: On weekends / holidays, counts are zero. Label the day type explicitly so Gautam doesn misread.
- **Over-long messages**: iMessage collapses anything over ~8 lines into "Read More". Use section headers and tight spacing to keep the above-fold content scannable.
- **Missing report**: Silent failure is worse than loud failure. Always send something, even if it a "KPI report failed - <reason>" alert.

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_getworklisttotals.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_Patient_Transaction_History_Details.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_Appointments.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_getreminderappts.htm`
- Memory: `user_gautam_role.md`, `reference_rc_phone_routing.md`, `reference_amd_api.md`, `feedback_imessage_channels.md`
- Related skill: `rc-pull-call-history` (for deeper phone dive), `amd-verify-insurance` (chained per new-patient triage)
- Output directory: `/Users/agent/pi-mono/.pi/services/reports/`
- TODO: confirm `getworklisttotals` XMLRPC path for practice-wide AR aging; fall back to UI export if ambiguous
