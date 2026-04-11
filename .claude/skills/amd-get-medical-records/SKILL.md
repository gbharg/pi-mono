---
name: amd-get-medical-records
description: Pull a full AMD patient chart snapshot (demographics, visits, notes, documents) for records release
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientDemographic, mcp__claude_ai_Keragon__com_keragon_advancedmd_getVisits, mcp__claude_ai_Keragon__com_keragon_advancedmd_getNewAndModifiedPatientNotes, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientDocument, mcp__claude_ai_Keragon__com_keragon_advancedmd_downloadPatientDocument, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientTransactionHistory, mcp__claude_ai_Keragon__com_keragon_microsoftoutlook_createDraftMail, mcp__claude_ai_Keragon__com_keragon_microsoftoutlook_sendMail
---

# amd-get-medical-records

## Purpose
Pull a full medical records package for a patient from AdvancedMD when another provider, the patient, or an attorney requests release. Output is a structured markdown chart summary plus a downloaded ZIP of all attached documents (labs, imaging, CCDAs, prior notes). This skill is **READ-ONLY** against AMD — no writes — but the output contains PHI and must be handled per HIPAA.

## Inputs
1. Patient identifier (name + DOB, or chart #, or patientid)
2. Requestor (who is asking — patient, provider, legal)
3. Scope (full chart / date range / specific document types)
4. Delivery destination (secure email to requesting provider, patient portal, encrypted ZIP for legal)
5. Signed ROI (release of information) on file? — Gautam must confirm yes before any export
6. Whether to include billing transaction history

## Prerequisites
- AMD API reachable (all `get*` calls are read-only, no approval needed under memory `feedback_amd_readonly.md`, BUT the record release itself is a PHI disclosure and requires Gautam approval)
- Signed ROI form uploaded to the patient chart OR verified by Gautam verbally
- Secure delivery channel configured (encrypted email, fax, or portal)
- Output directory: `/tmp/amd-records-<chart-last3>-<timestamp>/` with chmod 0700

## Workflow (API path — default, all read-only)

### Step 1. Verify ROI
Ask Gautam explicitly: "Is there a signed ROI on file for this release? Who is the requestor?" If no ROI, STOP. Cannot release records without documented patient consent.

### Step 2. Locate the patient
```
findPatient(firstName, lastName, dateOfBirth)
getPatientDemographic(patientId=<id>)
```
Capture `patientid`, `chartnumber`, `responsiblepartyid`. Cache demographic payload.

### Step 3. Pull visits
```
getVisits(patientId=<id>, startDate="2000-01-01", endDate="<today>")
```
For each visit: capture visitid, date, provider, cpt codes, diagnosis codes, charges, notes reference.

### Step 4. Pull patient notes
```
getNewAndModifiedPatientNotes(patientId=<id>, modifiedSince="2000-01-01")
```
Or per-visit: iterate visits and call `getNewAndModifiedPatientNotes` with the visit's modified-after timestamp. Capture all clinical notes (progress notes, psychiatric eval, intake, etc).

### Step 5. Pull document list
```
getPatientDocument(patientId=<id>)
```
(Tool is `getPatientDocument` per Keragon MCP — returns list of documents attached to chart.) Capture each `documentId`, type, filename, created date.

### Step 6. Download each document
For each documentId:
```
downloadPatientDocument(documentId=<id>)
```
Save to `/tmp/amd-records-<chart-last3>-<timestamp>/docs/<sanitized-filename>`. Keep file perms 0600.

### Step 7. Optional: transaction history
If requested:
```
getPatientTransactionHistory(patientId=<id>, startDate, endDate)
```
Capture for billing release (separate section in the export — some ROI requests explicitly exclude financial data).

### Step 8. Assemble markdown summary
Write `chart_summary.md` to the output dir with sections:
- Demographics (name, DOB, sex, address, phone — REDACTED in any logs)
- Insurance coverages
- Visit list (date, provider, dx, cpt, disposition)
- Progress notes (appended verbatim, each with date header)
- Documents inventory (filename, type, date)
- Transaction history (if included)

### Step 9. Package + deliver
1. Create a ZIP: `records_<chart-last3>_<yyyymmdd>.zip`
2. Encrypt with a password (7-zip AES-256) — share password via separate channel (iMessage to Gautam, never in the same email)
3. PAUSE for delivery approval. Ask Gautam: "Ready to send to <requestor>? Method: <email/fax/portal>?"
4. Send via the approved channel. Use Outlook `createDraftMail` first so Gautam can review before the actual send.

### Step 10. Log the disclosure
HIPAA requires a disclosure log. Append to `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`:
```
- <ISO timestamp> records release: chart=**<last-3>, requestor=<name/org>, scope=<full/range>, method=<email/fax>, authorized_by=Gautam, ROI=on_file
```
Do NOT log the patient name.

## Per-request approval
- Step 1 (ROI check) — verbal approval
- Step 9 (delivery) — explicit approval with requestor + channel
- Deliver only what the ROI covers; if ROI is for psychiatric notes only, exclude lab/imaging attachments

## Verification
- All visits in date range are in the summary
- Every listed document has a corresponding file in `docs/`
- ZIP opens with password + contains all artifacts
- Disclosure log entry is written

## Rollback
- If wrong patient was exported: delete `/tmp/amd-records-<chart>*` immediately, `srm` or `shred` the zip if available, and note in audit log: "EXPORT ABORTED — WRONG PATIENT"
- If email was sent in error to wrong address: IMMEDIATELY recall in Outlook if possible, notify Gautam, file a HIPAA breach report

## Common pitfalls
- **downloadPatientDocument returns base64**: Decode before writing. Filename may be missing — generate from documentId + mime type. TODO: verify exact parameter name (`documentId` vs `id`) by calling once and inspecting the response.
- **Large PDFs time out**: Retry with longer timeout or split into multiple calls by documentId
- **Encrypted notes**: Some psychiatry notes are marked "confidential" at the profile level and may not return via API. Check the returned list for any `confidential=1` flags and flag to Gautam.
- **Orphan documents**: Documents uploaded to the RP but not the patient may be missed. Also check `getFiles(patientId=<id>)` as a secondary source.
- **PHI in filenames**: Some chart documents have patient name in the filename. Sanitize to initials+date before saving locally.
- **ROI expiration**: Many ROI forms expire 12 months after signing. Gautam must confirm current validity, not just presence.

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_List_of_Documents.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_Document_by_Id.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_getpatientvisits.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_selectpatientnotes.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Upload_Document.htm`
- Memory: `feedback_amd_readonly.md`, `reference_amd_api.md`
- HIPAA disclosure log: `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`
