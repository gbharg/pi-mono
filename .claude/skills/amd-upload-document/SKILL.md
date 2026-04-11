---
name: amd-upload-document
description: Attach a scanned or uploaded file to a patient chart in AdvancedMD (PHI write, per-request approval required)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_uploadPatientDocument, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientDocument, mcp__claude_ai_Keragon__com_keragon_advancedmd_getFiles, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_file_upload, mcp__plugin_playwright_playwright__browser_snapshot
---

# amd-upload-document

## Purpose
Attach a scanned or uploaded file (PDF, JPG, PNG) to a patient chart in AdvancedMD for Exult Healthcare (office 161112). Supported doc types include ROI consents, photo ID, insurance cards, referral letters, clinical notes, labs, and imaging. This is a PHI write that cannot be cleanly rolled back - AMD does not support hard-delete of chart files.

## Supported document types (Exult master list)
| Code | Description | Typical source |
|---|---|---|
| ROI | Release of Information / HIPAA consent | Signed intake packet |
| ID | Driver license / state ID / passport | Front desk scan at check-in |
| INS_CARD | Insurance card (front or back) | Front desk scan at check-in |
| REFERRAL | Referring-provider letter | Faxed or emailed from PCP |
| NOTE | Clinical note or progress note | Provider scan |
| LAB | Laboratory result | Quest / LabCorp PDF |
| IMG | Radiology / imaging report | Outside imaging center |
| OTHER | Miscellaneous | Use only if nothing else fits |

## Inputs
1. Patient identifier (chart # or patientid)
2. File path (local filesystem - usually `/tmp/scan-*.pdf` from scanner output)
3. Document type code (from the table above)
4. Document date (date of the document, NOT upload date)
5. Description / title (e.g., "ROI signed 04/10/2026", "INS CARD front - Aetna")
6. Optional: associated visit ID (links doc to a specific encounter)

## Prerequisites
- AMD service account ARC022825 creds at `/Users/agent/.config/exult/admin-credentials.json`
- Keragon MCP `uploadPatientDocument` reachable OR XMLRPC `uploadfile` via `amd_xmlrpc_client.py`
- File exists at the given path, size <= 10 MB (AMD hard cap per `Content_Upload_Document.htm`)
- File type is PDF, JPG, PNG, TIF, or DOCX (AMD rejects .heic, .zip, .exe)
- Gautam explicit per-request approval (PHI write)
- Filename does NOT contain PHI (use `scan-<timestamp>.pdf`, not `SmithJohn-ROI.pdf`)

## Workflow (REST API path - default)

### Step 1. Resolve patient
```
findPatient(firstName, lastName, dateOfBirth)   # or getPatient(patientId)
```
Cache `patientid`.

### Step 2. Pre-check the file
```bash
python3 -c "
import os, base64, hashlib, mimetypes
fp = '<file path>'
sz = os.path.getsize(fp)
print('size_mb', round(sz/1048576, 2))
mt = mimetypes.guess_type(fp)[0]
print('mimetype', mt)
with open(fp, 'rb') as f:
    d = f.read()
print('sha256', hashlib.sha256(d).hexdigest()[:16])
print('base64_len', len(base64.b64encode(d)))
"
```
Abort if:
- size > 10 MB
- mimetype not in (pdf, jpg, png, tif, docx)
- file is 0 bytes
Capture the sha256 for audit logging.

### Step 3. PAUSE for approval
Summary (redacted):
```
UPLOAD DOCUMENT:
- Patient initials: [J.D.]
- Chart last-3: [**456]
- File: [scan-20260410-1015.pdf]
- Size: [1.8 MB]
- SHA256 last-12: [ab12cd34ef56]
- Doc type: [ROI]
- Doc date: [04/10/2026]
- Title: [ROI signed 04/10/2026]
- Linked visit: [none / apt#12345]
Confirm to upload?
```
Wait for explicit "go".

### Step 4. Upload via REST
Per `Content_Upload_Document.htm`, the production endpoint is:
```
POST https://providerapi.advancedmd.com/ehr-api/files/documents
Headers:
  appname: <your app name>
  Authorization: Bearer <token>
Body (JSON array):
[
  {
    "patientId": "<numeric id>",
    "name": "<title>",
    "description": "<doc type> - <date>",
    "fileBlob": "<base64 of file>"
  }
]
```
Required fields per AMD: `patientId`, `name`, `fileBlob`.

Keragon MCP equivalent:
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_uploadPatientDocument(
  patientId=<id>,
  name="<title>",
  description="<type> - <date>",
  fileBlob="<base64>"
)
```

Response codes per AMD docs:
- `200` success, returns `[{id: <new doc id>, name: <title>}]`
- `400` invalid input
- `403` permissions
- `500` server error

### Step 5. XMLRPC fallback
If REST fails, use `uploadfile` XMLRPC per `Content_uploadfile.htm` / `Content_Uploading_Files_to_Chart.htm`. The `addehrnote` or `adddocument` XMLRPC path is NOT the same - pick based on whether the destination is clinical notes or the files/documents shelf.

### Step 6. Verify the upload
```
getFiles(patientId=<id>)
# or getPatientDocument(patientId=<id>, documentId=<returned id>)
```
Confirm:
- New document row appears with the returned `id`
- Title matches
- File size matches (within 1 KB rounding)
- Document shows up under the correct chart tab (Files or Clinical Notes)

### Step 7. Log + scrub
- Append upload event to `/Users/agent/pi-mono/.pi/services/provisioning_audit.md` with: timestamp, patient initials, chart last-3, doc type, sha256 last-12, AMD doc ID
- Delete or shred the local `/tmp/scan-*.pdf` after successful upload (ROI packets are sensitive)
- NEVER leave the raw file in git or in the working tree

## Workflow (UI fallback path)
1. Playwright nav to `https://login.advancedmd.com/practicemanager/`
2. Open patient chart -> **Files** tab -> **Upload**
3. Choose file, set doc type dropdown, set date, set title
4. Click **Save**
5. Screenshot the resulting file list row
6. Log to audit file

## Per-request approval
REQUIRED for every upload. PHI write. Cannot be cleanly rolled back - the file persists in chart history even if "deleted" via UI (it becomes an archived revision).

## Verification
- `getFiles` lists the new doc with matching metadata
- SHA256 audit entry saved
- Local temp file shredded
- Memory `feedback_verify_agent_claims.md`: do NOT claim "uploaded" without a `getFiles` readback

## Rollback
- AMD does NOT support hard delete. The only recourse is to mark the doc archived + note `UPLOADED IN ERROR - DO NOT USE` in the description field, then upload the correct file
- If WRONG PATIENT was selected: this is a privacy incident. STOP, notify Gautam immediately. AMD support case may be needed to redact; HIPAA breach analysis may apply
- Do NOT try to patch it over by uploading the "correct" file and hoping no one notices

## Common pitfalls
- **File size**: 10 MB is a hard cap per AMD. Larger scans must be split or re-scanned at lower DPI.
- **HEIC from iPhone**: Not accepted. Convert to JPG/PDF first (sips on macOS, or Preview export).
- **PHI in filename**: Never use patient name in the local filename. Rename to `scan-<timestamp>.pdf` before upload.
- **Wrong doc type**: Uploading an insurance card under `NOTE` misroutes it and confuses the billing team. Use `INS_CARD`.
- **Wrong patient**: CATASTROPHIC. Double-check `patientid` matches the initials + DOB before Step 4.
- **Base64 encoding errors**: Python `base64.b64encode()` returns bytes - decode to str before JSON. Line-wrapped base64 may be rejected by some AMD endpoints; use un-wrapped.
- **Visit linkage**: Linking a doc to a visit makes it appear on that visit chart. Don't link unless the doc is visit-specific.
- **Claim of completion**: After upload, ALWAYS call `getFiles` and read back the new row. Do not report success from the HTTP 200 alone (memory `feedback_verify_agent_claims.md`).

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Upload_Document.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Uploading_Files_to_Chart.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Uploading_Files_to_the_Patient_Chart_Files.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_uploadfile.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_List_of_Documents.htm`
- Memory: `feedback_amd_writes.md`, `feedback_verify_agent_claims.md`, `reference_amd_api.md`
- Audit log: `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`
