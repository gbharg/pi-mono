# Exult Workflow Skills

Project-level skills for managing Exult Healthcare (McKinney TX psychiatry clinic) operations across AdvancedMD (EHR/PM) and RingCentral (phones). Each skill walks Claude end-to-end through a single common workflow.

Office: 161112. AMD API service account: ARC022825 (api@exulthealthcare.com). RC account: 2761864020, main number (469) 714-0006. Front Office queue: 55 (ext 881804009). Auto-receptionist: ext 2000 (id 62579250008).

## AdvancedMD

| Slug | Default path | One-liner |
|---|---|---|
| amd-add-patient | API (Keragon `createPatient` / XMLRPC `addpatient`) | Create a new patient chart with demographics, responsible party, and contact info. |
| amd-reschedule-appointment | API (`getOpenings` + cancel + `createAppointment`) | Move an existing visit to a new slot; preserves episode/provider/type. |
| amd-cancel-appointment | API (REST `PUT /scheduler/appointments/{id}/cancel`) | Cancel a visit with a reason code; optionally notify the patient. |
| amd-get-medical-records | API (`getPatientDocument` + `downloadPatientDocument`) | Pull a full chart snapshot (demographics, visits, notes, documents) for release. |
| amd-process-payment | API (XMLRPC `addpayments` / `applyPaymentToCharge`) | Post a patient payment against outstanding charges and generate a receipt. |

## RingCentral

| Slug | Default path | One-liner |
|---|---|---|
| rc-add-extension | API (`POST /account/~/extension`) | Provision a new user or admin extension with template + welcome email. |
| rc-disable-extension | API (`PUT /account/~/extension/{id}` status=Disabled) | Offboard a user: disable extension, remove from queues, archive voicemails. |
| rc-transfer-caller | UI (softphone) | Blind vs warm transfer playbook for a live call. |
| rc-update-call-queue | API (`POST/DELETE /call-queues/{id}/members`) | Add or remove agents from Front Office (queue 55) or any other queue. |
| rc-pull-call-history | API (`/account/~/call-log?view=Detailed`) | Export a date-range call log to CSV with recording links. |

## Conventions

- PHI-sensitive skills (add-patient, reschedule, cancel, records, payment) require per-request Gautam approval before any write. See memory `feedback_amd_writes.md`.
- NEVER log full patient name, DOB, chart#, insurance ID, SSN, or card numbers. Use last-4 or masked forms.
- Prefer API path; fall back to UI only if the API path is blocked. Log any block in `.pi/services/provisioning_audit.md`.
- AMD API reference cache: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/` (215 help files, local copy).
- AMD XMLRPC client: `/Users/agent/pi-mono/.pi/services/cohort_analysis/amd_xmlrpc_client.py`
- RC JWT credentials: `/Users/agent/pi-mono/.config/exult/ringcentral.json`
- AMD service creds: `/Users/agent/.config/exult/admin-credentials.json` (`advancedmd` key)
