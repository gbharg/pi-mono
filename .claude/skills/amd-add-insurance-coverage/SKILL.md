---
name: amd-add-insurance-coverage
description: Add or update an insurance plan on a patient chart in AdvancedMD (PHI write, per-request approval required)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientDemographic, mcp__claude_ai_Keragon__com_keragon_advancedmd_getCarriers, mcp__claude_ai_Keragon__com_keragon_advancedmd_createInsurance, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_fill_form, mcp__plugin_playwright_playwright__browser_snapshot
---

# amd-add-insurance-coverage

## Purpose
Add a new insurance plan (or update an existing one) to a patient chart in AdvancedMD for Exult Healthcare (office 161112). This is a PHI write that directly affects claims submission, so it requires per-request Gautam approval and accurate subscriber + policy data. Covers primary, secondary, and tertiary coverages.

## Inputs (collect from Gautam before starting)
1. Patient chart # or patientid
2. Carrier (must resolve to an AMD `carrierid` via `getCarriers` / `lookupcarrier`)
3. Member/policy number (subscriber ID)
4. Group number (may be blank for individual plans)
5. Subscriber name, DOB, sex (may equal patient or a different person)
6. Subscriber relationship to patient (self / spouse / child / other)
7. Plan begin date (usually 01/01/current year)
8. Optional: plan end date (for terminating or historical coverages)
9. Copay amount + type ($ or %)
10. Coverage order: primary / secondary / tertiary (`coverage=3` = primary per AMD schema)
11. Financial class code (e.g., COMM for commercial, MCR for Medicare)
12. Card images (front + back) - optional but recommended; chain to `amd-upload-document`

## Prerequisites
- AMD service account ARC022825 creds at `/Users/agent/.config/exult/admin-credentials.json`
- Keragon MCP `createInsurance` reachable OR XMLRPC `addinsurance` via `amd_xmlrpc_client.py`
- Gautam explicit written approval (PHI write, see memory `feedback_amd_writes.md`)
- Subscriber info verified against the physical card (don't trust verbal info alone)
- Carrier must already exist in the carrier master list (Exult has Aetna, BCBS TX, Cigna, UHC, Humana, Oscar preloaded - if a new carrier is needed, it must be added by Gautam in AMD Master Files first)

## Workflow (API path - default)

### Step 1. Resolve patient + responsible-party ID
```
findPatient(firstName, lastName, dateOfBirth)
getPatientDemographic(patientId=<id>)
```
Extract `patientid` (prefixed `pat...`) and the list of `respparty` entries. The subscriber must resolve to a `respparty` ID (format `resp...`). If the patient is self-subscribed, use the self-RP that was created with the patient. If the subscriber is someone else (spouse, parent), you may need to `addrespparty` first - that is a separate write and a separate approval.

### Step 2. Resolve carrier ID
```
getCarriers()   # or XMLRPC lookupcarrier
```
Match the plain-English carrier name to the AMD `carrierid` (format `car...`). If more than one match (e.g., "BCBS TX PPO" vs "BCBS TX HMO"), present both to Gautam and pick explicitly. Do NOT guess.

### Step 3. Determine relationship + HIPAA codes
Per memory `feedback_amd_writes.md` and `Content_Adding_and_Updating_Insurance_Coverages.htm`, the pair must match:
- Self: `relationship=1`, `hipaarelationship=18`
- Spouse: `relationship=2`, `hipaarelationship=01`
- Child: `relationship=3`, `hipaarelationship=19`
- Other: `relationship=4`, `hipaarelationship=G8`

A mismatched pair is silently accepted by AMD and then rejected by the clearinghouse on first claim submission. Verify before posting.

### Step 4. PAUSE for approval
Present to Gautam (redacted):
```
Ready to ADD insurance:
- Patient initials: [J.D.]
- Chart last-3: [**456]
- Carrier: [Aetna PPO / car7251]
- Policy last-4: [****1234]
- Group: [GRP5555]
- Subscriber: [SELF] or [initials + relationship]
- Begin date: [01/01/2026]
- Copay: [$30 flat]
- Coverage order: [1=primary]
- Finclass: [COMM]
Confirm to post?
```
Wait for explicit "go" / thumbs up.

### Step 5. Call addinsurance
Payload per `Content_Adding_and_Updating_Insurance_Coverages.htm`:
```json
{
  "ppmdmsg": {
    "@action": "addinsurance",
    "@class": "api",
    "@msgtime": "<mm/dd/yyyy hh:mm:ss AM/PM>",
    "patient": {
      "@id": "pat<patientid>",
      "@changed": "1",
      "insplanlist": {
        "insplan": {
          "@id": "",
          "@begindate": "<mm/dd/yyyy>",
          "@enddate": "",
          "@carrier": "car<carrierid>",
          "@subscriber": "resp<resppartyid>",
          "@subscribernum": "<policynum>",
          "@hipaarelationship": "18",
          "@relationship": "1",
          "@grpname": "",
          "@grpnum": "<grpnum>",
          "@copay": "30.00",
          "@copaytype": "$",
          "@coverage": "3",
          "@payerid": "",
          "@mspcode": "",
          "@finclasscode": "COMM",
          "@deductible": "0.00",
          "@deductiblemet": "0.00",
          "@yearendmonth": "1",
          "@lifetime": "0.00"
        }
      }
    }
  }
}
```
Keragon MCP equivalent (if available):
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_createInsurance(
  patientId=<id>,
  carrierId=<id>,
  subscriberId=<respid>,
  memberNumber=<policy>,
  groupNumber=<group>,
  relationship=1,
  hipaaRelationship=18,
  beginDate="YYYY-MM-DD",
  copayAmount=30.00,
  copayType="$",
  coverage=3
)
```

### Step 6. Verify the write
```
getPatientDemographic(patientId=<id>)
```
Confirm the new `insplan` appears in `insplanlist` with the correct `begindate`, `carrier`, `subscribernum`, and the correct `coverage` rank (3=primary, 2=secondary, 1=tertiary per AMD schema).

### Step 7. (Optional) Upload card images
Chain to `amd-upload-document` to attach front + back images of the insurance card as doc type `INS_CARD`. This is a SEPARATE write and a SEPARATE approval.

### Step 8. (Optional) Run eligibility
Chain to `amd-verify-insurance` to confirm the carrier actually recognizes the policy immediately. This is READ-ONLY, no extra approval needed.

## Workflow (UI fallback path)
1. Playwright nav to `https://login.advancedmd.com/practicemanager/`
2. Open patient chart -> **Insurance** tab -> **New Policy**
3. Pick carrier from dropdown, enter policy #, group, subscriber (default Self), begin date, copay
4. Click **Save**
5. Screenshot the resulting policy row for verification

## Per-request approval
REQUIRED (PHI write, affects claims). Always pause before Step 5. Never batch insurance adds across patients.

## Verification
- New `insplan` appears in `getPatientDemographic` with correct carrier + policy
- `coverage` order matches intent (primary/secondary/tertiary)
- Subscriber + HIPAA relationship codes paired correctly
- Optional: `amd-verify-insurance` returns `Cleared` or `Warn`

## Rollback
- Wrong policy info: call `addinsurance` again with the same `insplan.id` (after populating from step 6) to UPDATE in place
- Entirely wrong policy added: call `addinsurance` with `@enddate` set to yesterday to terminate. AMD does NOT support hard-delete of insurance - the row remains in history for audit
- Wrong carrier: terminate the bad row, add a fresh one with the correct carrier

## Common pitfalls
- **Relationship pair mismatch**: `relationship=1` MUST pair with `hipaarelationship=18`. A mismatched pair breaks claims silently.
- **Subscriber must be a respparty**: The `subscriber` attribute requires an existing `resp...` ID. If the subscriber is a non-patient (e.g., spouse not on file), you must `addrespparty` first.
- **Coverage order is inverted vs intuition**: AMD uses `coverage=3` for PRIMARY, `coverage=2` for SECONDARY, `coverage=1` for TERTIARY. Easy to get backwards.
- **Begin date in the future**: Eligibility will fail until the begin date arrives. Don't backdate unless Gautam confirms.
- **Group number optional**: For individual / marketplace plans, `grpnum` is often blank. Do not invent one.
- **Carrier name ambiguity**: "BCBS" alone is insufficient. Always resolve to the specific `carrierid` (BCBS TX PPO vs BCBS IL PPO vs BCBS Federal).
- **Copay type**: `$` for flat, `%` for coinsurance. Mixing these changes claim math.
- **Silent accept**: AMD accepts garbage policy numbers without validation. The clearinghouse rejects on first claim submit, days later.

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Adding_and_Updating_Insurance_Coverages.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Add_Insurance_Image.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_lookupcarrier.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_addrespparty.htm`
- Memory: `feedback_amd_writes.md`, `feedback_amd_readonly.md`, `reference_amd_api.md`
- XMLRPC client: `/Users/agent/pi-mono/.pi/services/cohort_analysis/amd_xmlrpc_client.py`
