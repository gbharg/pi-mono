---
name: amd-add-patient
description: Create a new patient chart in AdvancedMD with demographics, responsible party, and contact info (API preferred, UI fallback)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_advancedmd_createPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getFinancialClasses, mcp__claude_ai_Keragon__com_keragon_advancedmd_getProviders, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_fill_form, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_snapshot
---

# amd-add-patient

## Purpose
Create a new patient record in AdvancedMD for Exult Healthcare (office 161112) using the AMD API (preferred) or the AMD Practice Manager UI (fallback if the API is blocked). Populates demographics, responsible party, contact info, insurance placeholder, and sets the default financial class and provider profile.

## Inputs (collect from Gautam before starting)
1. Legal name (last, first [middle])
2. DOB (MM/DD/YYYY)
3. Sex (M/F/U)
4. Home phone + mobile phone (at least one required)
5. Email
6. Address (street, city, state, zip)
7. Insurance carrier + member ID + group # (optional at create time; can be added later)
8. Financial class (default: SELF PAY unless insured)
9. Provider profile (usually the attending psychiatrist — look up via `getProviders`)
10. Self-declared marital status, SSN (optional, ask don't demand)
11. Referral source (if known — new-patient intake form)

## Prerequisites
- AMD service account ARC022825 creds readable at `/Users/agent/.config/exult/admin-credentials.json`
- Keragon MCP `createPatient` tool reachable OR XMLRPC client at `/Users/agent/pi-mono/.pi/services/cohort_analysis/amd_xmlrpc_client.py` working
- Gautam explicit written approval to perform a PHI write (see memory `feedback_amd_writes.md`)
- Verify the patient does NOT already exist: call `findPatient` by name + DOB first

## Workflow (API path — default)

### Step 1. Duplicate check (no approval needed — read-only)
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient(
  firstName="<first>",
  lastName="<last>",
  dateOfBirth="YYYY-MM-DD"
)
```
If any patient is returned, STOP. Confirm with Gautam whether this is a true duplicate or a distinct person (family member same DOB is rare but happens). Do NOT proceed without resolution.

### Step 2. Look up financial class + provider profile IDs (read-only)
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_getFinancialClasses()
mcp__claude_ai_Keragon__com_keragon_advancedmd_getProviders()
```
Cache the IDs. For Exult, SELF PAY finclass is typically code `SP`; commercial insurances (Aetna, BCBS, Cigna, UHC) map to their own codes. Provider profile depends on who will see the patient (psychiatrist or therapist).

### Step 3. PAUSE for approval
Present to Gautam a summary in this format (redact PHI to last-4/initials when echoing to the session log):
```
Ready to create patient:
- Initials: [J.D.]
- DOB last-4 of year: [**70]
- Phone last-4: [**89]
- Insurance: [Aetna PPO or SELF PAY]
- Finclass: [code]
- Provider profile: [profileid/name]
- Chart: AUTO
```
Wait for explicit "go" (thumbs up / "yes, create").

### Step 4. Call createPatient
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_createPatient(
  firstName="...",
  lastName="...",
  dateOfBirth="YYYY-MM-DD",
  sex="M|F|U",
  homePhone="(XXX)XXX-XXXX",
  officePhone="",
  cellPhone="(XXX)XXX-XXXX",
  email="...",
  address1="...",
  address2="",
  city="...",
  state="TX",
  zip="...",
  relationship=1,      # 1=SELF
  hipaaRelationship=18, # 18=SELF
  chart="AUTO",
  profileId=<from step 2>,
  finClassCode="<from step 2>",
  maritalStatus=<1-6>
)
```
If the Keragon MCP is unavailable, fall back to XMLRPC `addpatient` via `amd_xmlrpc_client.py`. Refer to local doc `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_addpatient.htm` for the exact XML payload shape.

### Step 5. Verify the write
Call `findPatient` again or `getPatient` with the returned `patientid`. Confirm:
- Chart number was generated (non-empty)
- Responsible party `resppartyid` is populated (self-RP created automatically)
- AR buckets are initialized

### Step 6. Create insurance coverage (optional, separate approval)
If insurance was provided, use `mcp__claude_ai_Keragon__com_keragon_advancedmd_createInsurance` — this is a separate write and requires its own per-request approval.

## Workflow (UI fallback path)
If API is blocked:
1. Navigate Playwright to `https://login.advancedmd.com/practicemanager/` (auth as Gautam — credentials from `admin-credentials.json` `advancedmd.ui_admin`)
2. Click **Patients** tab -> **New Patient**
3. Fill required fields: Chart (AUTO), Name (Last, First), DOB, Sex, Relationship=Self, HIPAA=Self, Profile, Finclass
4. Click **Save**
5. Screenshot the resulting chart # and demographic page
6. Save screenshot under `/tmp/amd-add-patient-<timestamp>.png` — redact name in filename, use initials

## Per-request approval
- ALWAYS pause before Step 4 (the write).
- Approval is per-patient — do not batch.
- Gautam must confirm the insurance type (commercial vs self-pay) before create, because it drives the fee schedule ($375 new / $175 follow-up per memory `reference_exult_fees.md`).

## Verification
- `getPatient(patientId=<returned id>)` returns the full record
- Chart number is printed to Gautam (last 3 digits only if over imessage)
- Demographic fields round-trip match the input
- AR buckets exist and are zero

## Rollback
- AMD does NOT support patient delete via API. If wrong data was submitted, use `updatePatient` to correct. For full wipe: Gautam must open an AdvancedMD support case.
- For test/dev mistakes, mark the patient `inactive=1` via `updatePatient` and note in chart memo "CREATED IN ERROR - DO NOT USE".

## Common pitfalls
- **Name format**: Must be `LASTNAME,FIRSTNAME` (no space after comma). Middle name goes after first with a space: `SMITH,JANE MARIE`. Wrong format gets silently accepted and broken downstream.
- **Chart AUTO vs manual**: Always use AUTO unless explicitly instructed. Manual chart # conflicts throw 4xx.
- **Insurance verification blocks scheduling**: If insurance is entered but coverage is not yet verified, scheduling a visit may require manual override. Flag to Gautam.
- **Duplicate DOB+name**: AMD will block by default. Use `force=1` only with explicit approval for legitimate same-name-same-DOB cases (rare).
- **Relationship/HIPAA mismatch**: Must pair correctly. 1+18 for SELF, 2+01 for SPOUSE, 3+19 for CHILD, 4+G8 for OTHER.
- **Responsible party**: The initial create always sets respparty=SELF. To assign a parent/guardian RP, use `updatePatient` after create.

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_addpatient.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Look_Up_Patient.htm`
- Keragon tool docs: https://keragon.com/integrations/advancedmd
- AMD help: https://help.advancedmd.com/practicemanager/patient-add.htm
- Memory: `feedback_amd_writes.md`, `feedback_amd_readonly.md`, `reference_amd_api.md`, `reference_exult_fees.md`
- XMLRPC client: `/Users/agent/pi-mono/.pi/services/cohort_analysis/amd_xmlrpc_client.py`
