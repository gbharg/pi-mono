# Exult Workflow Skills

Project-level skills for managing Exult Healthcare (McKinney TX psychiatry clinic) operations across AdvancedMD (EHR/PM) and RingCentral (phones). Each skill walks Claude end-to-end through a single common workflow.

Office: 161112. AMD API service account: ARC022825 (api@exulthealthcare.com). RC account: 2761864020, main number (469) 714-0006. Front Office queue: 55 (ext 881804009). Auto-receptionist: ext 2000 (id 62579250008).

## AdvancedMD

| Slug | Default path | One-liner |
|---|---|---|
| amd-add-insurance-coverage | API (XMLRPC `addinsurance` / Keragon `createInsurance`) | Add or update an insurance plan on a patient chart. |
| amd-add-patient | API (Keragon `createPatient` / XMLRPC `addpatient`) | Create a new patient chart with demographics, responsible party, and contact info. |
| amd-cancel-appointment | API (REST `PUT /scheduler/appointments/{id}/cancel`) | Cancel a visit with a reason code; optionally notify the patient. |
| amd-check-in-patient | API (`updateAppointment` status=1) | Mark an arrived patient, optionally collect copay, generate ROI for new patients. |
| amd-get-medical-records | API (`getPatientDocument` + `downloadPatientDocument`) | Pull a full chart snapshot (demographics, visits, notes, documents) for release. |
| amd-issue-refund | API (XMLRPC `addpayments` negative PP / `applyPaymentToCharge`) | Refund a prior patient payment via negative-entry reversal (PCI-sensitive). |
| amd-process-payment | API (XMLRPC `addpayments` / `applyPaymentToCharge`) | Post a patient payment against outstanding charges and generate a receipt. |
| amd-reschedule-appointment | API (`getOpenings` + cancel + `createAppointment`) | Move an existing visit to a new slot; preserves episode/provider/type. |
| amd-send-patient-message | API (Patient Portal `lookuppatientportalaccount` + UI; Outlook email fallback) | Send a secure message to a patient via the AMD portal or consented email. |
| amd-upload-document | REST (`/ehr-api/files/documents`) / XMLRPC `uploadfile` | Attach a scanned file (ROI, ID, insurance card, referral, labs) to a chart. |
| amd-verify-insurance | API (XMLRPC `submitdemandrequest` + `checkeligibilityresponse`) | Run ANSI 270/271 eligibility check; emit Cleared / Warn / Blocked verdict. |

## RingCentral

| Slug | Default path | One-liner |
|---|---|---|
| rc-add-extension | API (`POST /account/~/extension`) | Provision a new user or admin extension with template + welcome email. |
| rc-disable-extension | API (`PUT /account/~/extension/{id}` status=Disabled) | Offboard a user: disable extension, remove from queues, archive voicemails. |
| rc-forward-number-to-queue | API (`POST /extension/{id}/answering-rule`) | Temporary coverage: forward a DID to the Front Office queue 55 on a schedule. |
| rc-pull-call-history | API (`/account/~/call-log?view=Detailed`) | Export a date-range call log to CSV with recording links. |
| rc-send-appointment-reminder-sms | API (`POST /extension/{id}/sms`) | Send a TCPA-compliant templated appointment reminder SMS from the main line. |
| rc-transfer-caller | UI (softphone) | Blind vs warm transfer playbook for a live call. |
| rc-update-call-queue | API (`POST/DELETE /call-queues/{id}/members`) | Add or remove agents from Front Office (queue 55) or any other queue. |
| rc-update-ivr | API (`PATCH /account/~/ivr-menus/{id}`) | Modify auto-receptionist IVR tree, greeting, or business-hours schedule. |

## Composite / cross-system

| Slug | Default path | One-liner |
|---|---|---|
| exult-daily-kpi-report | Read-only (RC call log + AMD aggregates) | Morning KPI report: calls, voicemails, today appointments, new patients, AR, collections, referrals. |

## Parent / context skills (mirrored from exult-agent)

These are the parent skills the operation-level skills above call into. They
provide the API / credential / archive context for a whole service. Mirrored
from `gbharg/exult-agent` — see [`MIRRORED.txt`](./MIRRORED.txt) for the slug
list and `scripts/sync-skills.sh` for the refresh procedure.

| Slug | Service | One-liner |
|---|---|---|
| advancedmd | AMD (EHR/PM) | Patient/appointment/visit ops via REST + XMLRPC + UI fallback. |
| autobrowse | Browser | Self-improving browser automation loop (vendored from browserbase/skills). |
| curogram | Curogram | HIPAA SMS — REST + GraphQL, cookie-based session. |
| daily-summary | Cross-system | End-of-day operational report rollup. |
| excel | M365 | Read/write OneDrive workbooks + build local .xlsx. |
| fax | RingCentral | Fax send/receive/status. |
| finance | Local data | Billing/charges/KPI analysis over parquet + daily tracker. |
| messages | Sendblue | iMessage / SMS history fetch + archive. |
| outlook | M365 | Mail / calendar / OneDrive via Microsoft Graph. |
| pdf | Local | Read/extract/generate PDFs (reads, OCR-aware, weasyprint/reportlab). |
| ringcentral | RingCentral | Calls, voicemail transcripts, queues, SMS. |
| rippling | Rippling | Employee / payroll sync. |
| vercel | Vercel | Exult website deploys + DNS + visual QA. |
| verify | Local | Post-action HIPAA + intent + API-response verification. |
| word | Local | Clinical letters / referral / .docx generation. |

## Conventions

- PHI-sensitive skills (add-patient, reschedule, cancel, records, payment, refund, insurance, check-in, upload, messaging) require per-request Gautam approval before any write. See memory `feedback_amd_writes.md`.
- NEVER log full patient name, DOB, chart#, insurance ID, SSN, or card numbers. Use last-4 or masked forms.
- Prefer API path; fall back to UI only if the API path is blocked. Log any block in `.pi/services/provisioning_audit.md`.
- Financial writes (payments, refunds, SMS cost runs) require dollar-amount read-back in the approval message.
- Patient communications (portal messages, email, SMS) require channel + content approval per message.
- READ-ONLY skills (eligibility check, daily KPI report, call history export, records pull) do not need per-request approval but must still redact PHI in logs.
- AMD API reference cache: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/` (215 help files, local copy).
- AMD XMLRPC client: `/Users/agent/pi-mono/.pi/services/cohort_analysis/amd_xmlrpc_client.py`
- RC JWT credentials: `/Users/agent/pi-mono/.config/exult/ringcentral.json`
- AMD service creds: `/Users/agent/.config/exult/admin-credentials.json` (`advancedmd` key)
- M365 creds: `/Users/agent/.config/exult/microsoft365.json`
- Curogram creds: `/Users/agent/.config/exult/curogram.json`
- AMD PHI / visit cache: `/Users/agent/pi-mono/.pi/services/amd/`
- Messages archive: `/Users/agent/pi-mono/.pi/messages/archive/YYYY-MM-DD.json`
- RC archive (call logs, voicemails): `/Users/agent/pi-mono/.pi/services/rc/archive/`
- Audit log: `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`
- Reports archive: `/Users/agent/pi-mono/.pi/services/reports/`
