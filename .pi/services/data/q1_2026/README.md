# Q1 2026 Raw Data Archive — Exult Healthcare

**Window:** 2026-01-01 → 2026-03-31 (Q1)
**Purpose:** Persistent, indexable copy of all data pulled during the Q1 workflow/cost-model analysis so future sessions can search without re-hitting APIs.
**Created:** 2026-04-05 (post API FULL seat unlock)

## PHI warning

This directory contains raw patient-identifiable data. `.gitignore` in this directory blocks all files except `README.md`, `index.json`, and `.gitignore` itself from being committed. **Do not force-add any file here to git.**

Everything else should be treated as HIPAA-covered PHI and kept local only.

## Layout

```
data/q1_2026/
├── .gitignore           # blocks all but readme/index
├── README.md            # this file
├── index.json           # machine-readable manifest
├── amd/                 # AdvancedMD raw pulls
│   ├── rest_scheduler_appointments_full.json       # 7.8 MB, REST scheduler Q1 pull (status-filtered)
│   ├── rest_q1_summary_full.json                   # aggregates from above
│   ├── rest_q1_analysis_prelim.json                # early summary
│   ├── rest_q1_creation_sample.json                # creation-date sample
│   ├── rest_scheduler_columns.json                 # scheduler column map
│   ├── xmlrpc_getupdatedvisits_q1_raw.xml          # 143 KB, XMLRPC raw response (6,023 IDs)
│   ├── xmlrpc_getupdatedvisits_q1_ids.txt          # flat list of all 6,023 visit IDs
│   ├── xmlrpc_hidden_visit_ids_q1.json             # 3,089 IDs hidden from REST
│   ├── xmlrpc_hidden_visit_sample300.json          # 300-record classified sample
│   ├── xmlrpc_getvisitinfobydate_q1_detail.xml     # 143 KB, visit detail raw
│   ├── xmlrpc_getupdatedpatients_q1_raw.xml        # 30 KB, new+updated patient raw
│   ├── xmlrpc_new_patient_ids.txt                  # flat list of new patient IDs
│   ├── _ref_DAILY_BASELINE.md                      # symlink to committed baseline
│   └── _ref_q1_hidden_visits_analysis.json         # symlink to committed analysis
├── ringcentral/
│   ├── rc-call-log-2026-q1.csv                     # aggregated daily log (committed elsewhere)
│   ├── rc_q1_calls_raw.ndjson                      # per-call records (inbound + outbound)
│   └── _ref_DAILY_BASELINE_NON_AMD.md              # symlink
└── m365/
    ├── {mailbox}_q1.ndjson                         # per-mailbox Q1 messages
    └── _pull_summary.json                          # count per mailbox
```

## Source credentials used

- **AMD:** GAUTAM session cookies captured via Playwright at 2026-04-05 04:56Z. Token format `161112{64hex}`. Expires with session. **Not** ARC022825 API FULL — that account was used only for the one-shot getupdatedvisits call and is reserved for targeted XMLRPC view actions going forward.
- **RingCentral:** JWT bearer exchange via app `Remote Admin`, `ReadCallLog` scope. Creds at `.config/exult/ringcentral.json`.
- **Microsoft Graph:** app-only client_credentials flow, tenant `exulthealthcare.com`. Creds at `.config/exult/microsoft365.json`.

## Business-day note

All per-day averages elsewhere in the project use `business_days = 65` (Mon-Fri, excluding New Year's Day, MLK Day, Presidents Day). Weekend / holiday rows exist in raw files but are not in any averaged metric.

## Regeneration

If the raw files are lost, each can be re-pulled via the endpoints documented in:
- `.pi/services/amd/API_REFERENCE.md` — observed AMD endpoints
- `.pi/services/exult/rc-endpoints.md` — RingCentral endpoints
- `.pi/services/exult/graph-endpoints.md` — Microsoft Graph endpoints

Rate limit reminders:
- AMD providerapi: 60/hour, 3/minute. Hit the limit? Wait. Don't retry in a loop.
- RC Heavy API: 10/minute, pace at 7s between calls.
- Graph: generally comfortable under 10k msgs/hour.
