---
name: rc-pull-call-history
description: Export a RingCentral date-range call log to CSV with recording links
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_ringcentral_getCompanyCallRecords
---

# rc-pull-call-history

## Purpose
Export RingCentral call records (account-level or extension-level) for a given date range and output as CSV with recording URLs for answered calls. Used for: daily call review, billing reconciliation, HR investigations, patient-complaint lookups, and the daily KPI report. Read-only — no writes to RC.

## Inputs
1. Date range (start and end, ISO YYYY-MM-DD or relative like "yesterday", "last 7 days", "Q1 2026")
2. Scope: account-wide, or a specific extension (ext 104, queue 55, etc)
3. Direction filter (inbound / outbound / both)
4. Call type filter (Voice / Fax / all)
5. Include recordings? (default yes — links only, not downloaded inline)
6. Output path (default: `/tmp/rc-calls-<scope>-<start>-<end>.csv`)

## Prerequisites
- RC JWT creds with `ReadCallLog` and `ReadCallRecording` scopes (verify in `ringcentral.json` — both are present)
- Time range: RC detailed call log is retained for approximately 2 years. Older data requires the CDR archive.
- Output directory writable; files chmod 0600 to protect PHI (caller numbers are PHI under some interpretations)

## Workflow (API path — default)

### Step 1. Get OAuth token (JWT flow)
```bash
TOKEN=$(curl -sX POST "https://platform.ringcentral.com/restapi/oauth/token" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
  -d "assertion=$JWT" | jq -r .access_token)
```

### Step 2. Build the query
Use the company call log endpoint for account-wide, or the extension call log for a single ext:
```
GET /restapi/v1.0/account/~/call-log?view=Detailed&dateFrom=<ISO>&dateTo=<ISO>&perPage=250&page=1
```
For a specific extension:
```
GET /restapi/v1.0/account/~/extension/<ext-id>/call-log?view=Detailed&dateFrom=<ISO>&dateTo=<ISO>&perPage=250&page=1
```

Parameters:
- `view=Detailed` — returns the recording URL field if present (vs `Simple`)
- `dateFrom` / `dateTo` — ISO 8601 with timezone (use `America/Chicago` offset or UTC — be consistent)
- `perPage=250` — max allowed per request
- `page=N` — paginate
- `type=Voice` or `Fax` — filter call type
- `direction=Inbound|Outbound`

### Step 3. Paginate all pages
Loop `page=1,2,3,...` until `navigation.nextPage` is absent. Collect all `records[]`. Pagination safety: the API limits to ~1000 records per page in bulk mode; for multi-day exports use `dateFrom`/`dateTo` chunks (e.g., 7-day windows) to avoid missing records under the cap.

### Step 4. Parse each record
Each record contains:
- `id` — call id
- `startTime` — ISO
- `duration` — seconds
- `direction` — Inbound/Outbound
- `from.phoneNumber` + `from.name` (if caller ID)
- `to.phoneNumber` + `to.extensionNumber` + `to.name`
- `type` — Voice/Fax
- `result` — Accepted/Missed/Voicemail/Rejected/Busy/Disconnected
- `recording.id` + `recording.uri` (if present) — only for Accepted + recorded calls
- `legs[]` — for multi-leg calls (queue -> agent)

### Step 5. Resolve recording URLs
`recording.uri` is a RC API URL, not a playable audio URL. To get the actual audio:
```
GET /restapi/v1.0/account/~/recording/<recording-id>/content
```
Returns binary MP3/WAV. For the CSV, emit the API URL — the reviewer can fetch it with the same token. Optionally, download inline if Gautam requests audio files.

### Step 6. Emit CSV
Write to the output path with header row:
```
startTime,direction,result,fromNumber,fromName,toNumber,toExt,durationSec,type,recordingUrl,callId
```
One row per record. Use `csv.DictWriter` with `quoting=csv.QUOTE_MINIMAL`. Chmod 0600 after write.

### Step 7. Report stats
Print to Gautam:
```
Call export complete:
- Range: <start> to <end>
- Scope: <ext or account>
- Total records: <N>
- Answered: <N>, Missed: <N>, VM: <N>
- With recordings: <N>
- File: /tmp/rc-calls-<scope>-<start>-<end>.csv (<size> KB)
```

## Reference Python snippet
An existing version of this query is at `/Users/agent/pi-mono/.pi/services/rc_archive/` (see `company_call_log_2wk_detailed.json` as an example output and `company_call_log_90d_simple.json` for the wider form). Adapt that shape for new exports.

## Per-request approval
- READ-ONLY — no writes, so no approval needed for the data pull
- HOWEVER: if the export will be shared outside Exult (e.g., sent to a patient's attorney, HR investigation, external auditor), that delivery IS a PHI disclosure and requires Gautam approval. Treat the CSV like medical records for delivery purposes.

## Verification
- CSV opens in a spreadsheet tool and has expected column headers
- Record count roughly matches expectations (e.g., a normal day has 30-80 calls for Exult)
- Recording URLs are populated for calls where `result=Accepted` and recording was enabled
- No duplicate call IDs

## Rollback
N/A — export is a read operation. If the output file is wrong, delete it and re-run.
If CSV was shared incorrectly: notify Gautam, document in audit log, attempt to recall (email recall) where possible.

## Common pitfalls
- **Missing recordings**: Recording is only enabled per-extension or per-queue. Not all accepted calls have recordings. `recording` field will be absent.
- **Timezone confusion**: `dateFrom`/`dateTo` must be in a consistent zone. Use ISO 8601 with `-05:00` or `-06:00` offset for America/Chicago (DST-aware) or UTC. Mixing causes off-by-one-day errors.
- **Pagination silently cut**: If you request `dateFrom` that's too old and too wide, RC caps the response and silently drops older records. Chunk by day or week for safety.
- **Extension vs account endpoint**: Using `/account/~/call-log` returns ALL extension activity (account-wide). Using `/extension/<id>/call-log` returns ONLY that extension's calls. Don't mix them up.
- **Rate limits**: RC call log endpoint is ~40 req/min for the standard token. For large exports, add delays (500ms) between pagination calls.
- **Queue leg data**: A queue call appears once per leg (queue leg + agent leg). Dedupe by `id` if you want unique callers.

## References
- RC API: https://developers.ringcentral.com/api-reference/Call-Log/readCompanyCallLog
- RC API: https://developers.ringcentral.com/api-reference/Call-Log/readUserCallLog
- RC API: https://developers.ringcentral.com/api-reference/Call-Recordings/getCallRecordingById
- Reference outputs: `/Users/agent/pi-mono/.pi/services/rc_archive/company_call_log_2wk_detailed.json`
- Credentials: `/Users/agent/pi-mono/.config/exult/ringcentral.json`
