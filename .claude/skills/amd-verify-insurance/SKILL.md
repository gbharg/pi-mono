---
name: amd-verify-insurance
description: Run ANSI 270/271 eligibility check on a patient insurance plan BEFORE scheduling (read-only, no PHI write)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientDemographic, mcp__claude_ai_Keragon__com_keragon_advancedmd_getCarriers, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_snapshot
---

# amd-verify-insurance

## Purpose
Run an electronic eligibility check (ANSI 270 request / 271 response) against a patient active insurance coverage in AdvancedMD for Exult Healthcare (office 161112) BEFORE a visit is scheduled. Parses the 271 response into a structured summary (coverage active, deductible remaining, copay, OOP max, prior-auth flags) and issues a single traffic-light verdict: `Cleared` / `Warn` / `Blocked`. This skill is READ-ONLY. No PHI is written to AMD, no per-request approval required.

## Inputs
1. Patient identifier (chart #, or first + last + DOB)
2. Service date (default today)
3. Optional: specific CPT(s) to check. Psychiatry default set is `99213, 99214, 90834, 90837, 90791`
4. Optional: insurance plan to check (if patient has >1 coverage. default: primary)

## Prerequisites
- AMD service account ARC022825 creds at `/Users/agent/.config/exult/admin-credentials.json`
- Keragon MCP tools reachable OR XMLRPC client at `/Users/agent/pi-mono/.pi/services/cohort_analysis/amd_xmlrpc_client.py`
- Patient must have at least one active `insplan` on file (use `amd-add-insurance-coverage` first if not)
- No Gautam approval required. Eligibility checks are read-only, zero PHI write

## Workflow (API path - default)

### Step 1. Resolve patient + insurance plan
```
findPatient(firstName, lastName, dateOfBirth)   # or getPatient(patientId)
getPatientDemographic(patientId=<id>)
```
Extract:
- `patientid`
- `insurancecoverageid` for the primary (or the specified) plan
- `carrier` name + `payerid`
- subscriber name + DOB + relationship

If no active `insplan`, STOP and direct Gautam to `amd-add-insurance-coverage` first.

### Step 2. Submit eligibility check (ANSI 270)
XMLRPC `submitdemandrequest` (class `atseligibility`). Payload per `Content_Eligibilty.htm`:
```json
{
  "ppmdmsg": {
    "@action": "submitdemandrequest",
    "@class": "atseligibility",
    "@msgtime": "<mm/dd/yyyy hh:mm:ss AM/PM>",
    "@eligibilitystc": "30",
    "@patientid": "<id>",
    "@insurancecoverageid": "<id>"
  }
}
```
`eligibilitystc=30` is "Health Benefit Plan Coverage" - the standard default. For behavioral-health-specific checks, also run `stc=MH` (Mental Health) and `stc=AI` (Substance Abuse).

Response returns an `eligibilityid`. Cache it.

### Step 3. Poll for the 271 response
XMLRPC `checkeligibilityresponse` with the returned `eligibilityid`. Loop with 2s backoff, max 30s. The response contains `eligibilitystatusid`:
- `0` = pending (keep polling)
- `1` = successful (271 returned)
- `2` = rejected (carrier not reachable / bad info)
- `3` = error

On success the payload contains benefit segments keyed by service type code. Parse out:
- `coveragestatus` (active / inactive / termed)
- `deductible.remaining` + `deductible.met`
- `copay.amount` + `copay.servicetype`
- `coinsurance.pct`
- `outofpocket.max` + `outofpocket.remaining`
- `priorauth.required` flag per CPT

### Step 4. Score the 5 psychiatry CPTs
For each of `99213, 99214, 90834, 90837, 90791`, determine:
- Covered? (yes/no/unknown)
- Copay (dollar)
- Prior-auth required? (yes/no)
- Any visit cap? (e.g., "20 visits/yr")

### Step 5. Emit verdict
Rules:
- `Cleared`: coverage active, no prior auth required for any of the 5 CPTs, copay known, deductible >= $0
- `Warn`: coverage active BUT prior auth needed for 1+ CPT, OR deductible > $1000 remaining, OR copay unknown
- `Blocked`: coverage inactive / termed / rejected, OR no response after 60s

### Step 6. Output structured summary
Example iMessage-safe format:
```
ELIGIBILITY - Initials JD - chart last-3 **456
Carrier: Aetna PPO
Status: ACTIVE (as of 04/10/2026)
Deductible: $500 remaining (of $1500)
Copay: $30 office, $40 specialist
OOP max: $3800 remaining (of $5000)
Prior auth: NONE for 99213/99214/90834/90837, REQUIRED for 90791 (intake)
Visit cap: 26 visits/yr outpatient BH
Verdict: WARN - 90791 needs PA before new-patient intake
Eligibility ID: 6087468  Checked: 04/10/2026 10:12 AM
```

## Workflow (UI fallback path)
If the eligibility API is unreachable:
1. Playwright nav to `https://login.advancedmd.com/practicemanager/` (creds from `admin-credentials.json` `advancedmd.ui_admin`)
2. Open the patient chart (Patients tab -> search -> select)
3. Click the **Insurance** tab -> select active plan -> **Check Eligibility**
4. Wait for the 271 response card -> screenshot the benefits summary
5. Save screenshot at `/tmp/amd-elig-<initials>-<yyyymmdd>.png`
6. Manually transcribe the 6-field summary (coverage / deductible / copay / OOP / prior auth / visit cap) into the output format above

## Per-request approval
NOT required. Eligibility is a read-only query. Zero PHI write, zero financial change. Log the check in the session transcript only (with initials + last-3 chart + eligibility ID - never full PHI).

## Verification
- `eligibilitystatusid=1` returned
- 271 response contains at least one benefit segment
- All 5 psychiatry CPTs scored (or marked "unknown" with reason)
- Verdict emitted with one of the 3 values

## Rollback
N/A. Read-only. If the wrong patient was checked, simply re-run against the correct patient. Carrier is not charged for a 270/271 lookup.

## Common pitfalls
- **Stale insurance on file**: Eligibility can say ACTIVE for a plan that the patient already dropped. Ask Gautam to confirm the card on file is current if the visit is >30 days out.
- **STC 30 is not mental-health-specific**: Running only `stc=30` misses behavioral-health carve-outs (e.g., Magellan-managed Aetna). Always also run `stc=MH` and cross-reference.
- **Prior-auth silent on 271**: Some carriers return `N/A` for PA requirements. This is NOT "no PA required", it is "not determinable via 270/271". Flag as `WARN` and ask Gautam to verify via carrier portal or phone.
- **Subscriber relationship mismatch**: If the patient is a dependent (child on parent plan), the 270 must send the subscriber info, not the patient info. AMD handles this if `insplan.subscriber` is correctly set; otherwise the carrier rejects with 72/73 error.
- **Carrier downtime**: Medicare/Medicaid payers frequently return `AAA*42` (unable to respond). Retry once after 5 minutes; if still failing, mark `Blocked` and do UI fallback.
- **Double counting deductible**: If the patient has secondary coverage, the primary 271 deductible is not the patient effective OOP. Run eligibility on BOTH and combine.

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Eligibilty.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_Additional_Demographics.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Adding_and_Updating_Insurance_Coverages.htm`
- AMD help: https://help.advancedmd.com/practicemanager/insurance-eligibility.htm
- ANSI 270/271 spec: X12 Version 5010
- Memory: `reference_amd_api.md`, `feedback_amd_readonly.md`
- XMLRPC client: `/Users/agent/pi-mono/.pi/services/cohort_analysis/amd_xmlrpc_client.py`
