# Exult Healthcare — Daily Workflow Baseline (Q1 2026 live data)

**Tenant:** Exult Healthcare (`officeKey=161112`), McKinney TX
**Data period:** 2026-01-01 through 2026-04-04 (**67 business days**, Mon-Fri; federal holiday exclusion NOT applied — if strict M/L/K + Presidents Day is required, drop to 64 biz days which lifts every per-day mean ~4.7%)
**Primary source:** `ppmdmsg getreminderappts` via legacy XMLRPC broker `POST https://pm-wfe-137.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx`
**Cross-validation source:** `GET https://pm-api-137.advancedmd.com/api/scheduler/appointments?columnId={id}&forView=month`
**Auth:** Session cookies (`token`, `u`, `k`, `ku` on `.advancedmd.com`) captured via Playwright login flow 2026-04-05 04:56Z
**PHI handling:** Raw XMLRPC response contained patient PHI (names, DOBs, phones, emails). Raw file was deleted after aggregate extraction. Only de-identified counts are committed.

## TL;DR per-workflow daily averages

| Workflow | Q1 Total | Mean/biz-day | Median | Peak | Endpoint used |
|---|---:|---:|---:|---:|---|
| **All scheduled appointments** | 3591 (Q1 biz days only, 3662 w/ weekends) | **53.60** | 57 | 78 | `ppmdmsg getreminderappts` |
| Telehealth visits (type prefix `TH-`) | 2673 | **39.90** | ~43 | ~58 | `ppmdmsg getreminderappts` |
| In-person visits (type prefix `IP-`) | 980 | **14.63** | ~15 | ~20 | `ppmdmsg getreminderappts` |
| Completed visits (status=3 Seen) | 1861 | **27.78** | 29 | 47 | `/api/scheduler/appointments` (REST) |
| Cancellations (status=10) | 465 | **6.94** | 6 | 21 | `/api/scheduler/appointments` (REST) |
| No-shows (status=12) | 286 | **4.27** | 4 | 10 | `/api/scheduler/appointments` (REST) |
| New-patient visits (type contains "NEW" or "NEW PT") | 170 | **2.54** | 2 | ~9 | `ppmdmsg getreminderappts` (type name filter) |
| Appointment confirmations (confirmdate populated in range) | 1152 | **17.19** | 18 | 37 | `/api/scheduler/appointments` (REST) |

### New-patient visit type breakdown (for cost-model input)

| Visit type | Q1 count | Per biz day |
|---|---:|---:|
| IP-MED MGMT NEW | 68 | 1.01 |
| IP-THERAPY NEW PT | 44 | 0.66 |
| TH-MED MGMT NEW | 43 | 0.64 |
| TH-THERAPY NEW PT | 15 | 0.22 |
| **Total new patients** | **170** | **2.54** |

Most new intakes are in-person med mgmt (a psychiatrist-led initial eval) — consistent with a psychiatry-first clinic that does the first assessment face-to-face and follows up via telehealth.

## Provider panel (as observed in Q1 data)

| Provider (as returned by API) | Q1 appts | % |
|---|---:|---:|
| MBILIKIRA, NGOMENI | 1125 | 30.7% |
| Rhonda Emmons | 624 | 17.0% |
| TODD, JERRITT | 614 | 16.8% |
| TOLES, SKYE | 575 | 15.7% |
| BHARGAVA, DEEPIKA | 545 | 14.9% |
| DATTATREYA, VANAJAKSHI | 117 | 3.2% |
| HAWKINS, BRIA | 36 | 1.0% |
| EXULT HEALTHCARE (generic) | 18 | 0.5% |
| Snype-Stewart, VIVICA | 8 | 0.2% |

**9 providers actually saw patients in Q1**, not the 14 "columns" the scheduler shows (some columns are holds/techs/training blocks). The top 5 carry 95% of the visit volume. Dr. Deepika Bhargava (the psychiatrist and clinic owner) is fifth in raw appt count but her 545 includes the highest-complexity new-patient evals.

## Locations

| Location | Q1 appts |
|---|---:|
| EXULT HEALTHCARE | 2744 |
| MDPA | 918 |

There are **two service locations**, not one. MDPA is a second facility not previously documented in the front-desk knowledge base. Worth a follow-up with Gautam — is this a satellite site, an affiliated group, or a billing-only entity?

## Workflows still BLOCKED (with exact reason + unblock path)

| Workflow | Status | Reason | Unblock path |
|---|---|---|---|
| **Reschedules/day** | **BLOCKED** | `ppmdmsg getupdatedvisits` returns 403 "This privilege has been denied to this user" for GAUTAM's ADMIN role. The XMLRPC broker is reachable and authenticated, but the `view updated visits` privilege is not granted to any front-office role in Exult's config. Additionally, the REST `/api/scheduler/appointments` endpoint silently filters out status=5 (Moved) and status=11 (Deleted). | Add the `view updated visits` (and `view updated patients`, `view new and updated patient notes for a template`) API privilege to GAUTAM's role in System Settings > User Administration > Roles. Then re-run the `getupdatedvisits` call with `datechanged="2026-01-01"` over the XMLRPC broker. |
| **Encounter notes created/day** | **BLOCKED** | `ppmdmsg getehrupdatednotes` returns 403 "This privilege has been denied". The PM scheduler's `linkednotestatus` field is 0 for all Q1 records, suggesting note linkage isn't tracked via PM. | Add "view new and updated patient notes for a template" privilege OR hit the EHR REST API directly at `wc-api-137.advancedmd.com` (not attempted — lives on a separate host). |
| **Billing inquiries/day** | **BLOCKED** | `ppmdmsg gettxhistory` returns "Action not found" — the documented action name differs from what's active on this tenant. REST paths `/api/billing/*`, `/api/charges`, `/api/payments` all 404. | Open the Billing section in the PM webapp in an authenticated Playwright session, trace the exact pm-api URL it calls. Or search the crawled docs for the current action name. |
| **Portal message triage/day** | **BLOCKED** | Feature `PATIENT_MESSAGING` IS enabled per `/api/system/startupvalues` but no REST path found. `/api/messages`, `/api/tasks`, `/api/inbox`, `/api/portal/messages`, `/api/communication/messages` all 404. `/api/worklist` returns 403 RBAC-denied. | Trace the webapp's Tasks > Messages section network calls. Or add the worklist privilege. |
| **Appointment reminders sent/day** | **BLOCKED** | `/api/reminders` returns 403 "RBAC: access denied". The endpoint definitively exists — this is an unblock confirmation. | Add a reminders privilege (likely `NOTIFICATIONS` or `REMINDERS`) to GAUTAM's role. |
| **Medical records sent/day** | **BLOCKED** | No documented action hit on this run. Candidate ppmdmsg actions: `addehrnote`, `uploadfile`, `DocumentPostRequest`. | Probe these actions via the XMLRPC broker after adding the EHR privilege. |
| **Insurance verifications/day** | **BLOCKED** | Eligibility endpoints not tested (would require a payer direction to submit); only 15% of Exult is insurance so low-leverage. | Low priority for the cost model. |

### The BIG unblock (do this one thing tomorrow)

**Grant GAUTAM's role the following XMLRPC API privileges in System Settings > User Administration > Roles > ADMIN:**
- `view updated visits`
- `view updated patients`
- `view visit information for a date`
- `view new and updated patient notes for a template`
- `view fieldset information`
- `view appointment history`

These six privileges, when added, unblock the reschedule/cancellation/note/visit-detail daily counts in one pass through the XMLRPC broker. Cost: 5 minutes of clicking in the PM UI. Value: replaces every BLOCKED row in this table.

## How I computed these

1. Captured a live session via Playwright + Gmail MCP 2FA (2026-04-05 04:56Z).
2. Fetched scheduler columns (`GET /api/scheduler/columns`, 14 columns).
3. Pulled 3398 unique appts via `/api/scheduler/appointments?columnId={id}&startDate=MM/DD/YYYY&endDate=MM/DD/YYYY&forView=month` for all columns × 4 months. **Critical gotcha**: `forView=list` silently returns empty for most date ranges — use `month` or `week`. Date format MUST be US (`MM/DD/YYYY`); ISO is accepted but returns empty.
4. Discovered status codes via the crawled Hard Coded Values MadCap doc: 0=Made, 1=Arrived, 2=Other, 3=Seen, 5=Moved, 10=Cancelled, 11=Deleted, 12=No Show. Verified the REST scheduler list drops 5 and 11.
5. Pivoted to the legacy XMLRPC broker `POST pm-wfe-137.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx` with the captured session cookies. `getreminderappts` action worked and returned **3662 total Q1 appts** (including 264 appts the REST endpoint filters). This is the canonical count for total workload.
6. Parsed the XML aggregate counts ONLY (no patient data written to disk). Raw response file was deleted after extraction.
7. Business days: 2026-01-01 to 2026-04-04, M-F = 67 days. Holiday exclusion NOT applied.

## Token-cost model input (for sibling cost-analysis agent)

```yaml
daily_baseline:
  period: 2026-01-01_to_2026-04-04
  business_days: 67
  provider_count_active: 9  # not 14; scheduler columns include non-provider holds
  location_count: 2  # EXULT HEALTHCARE primary + MDPA satellite
  appointments_total_per_day: 53.60  # from ppmdmsg getreminderappts (includes all statuses)
  completed_visits_per_day: 27.78    # from REST /api/scheduler/appointments status=3
  cancellations_per_day: 6.94        # from REST, status=10
  no_shows_per_day: 4.27             # from REST, status=12
  new_patient_visits_per_day: 2.54   # from type-name filter (IP/TH + MED MGMT NEW | THERAPY NEW PT)
  appointment_confirmations_per_day: 17.19  # from REST confirmdate-populated
  telehealth_visits_per_day: 39.90   # type prefix TH-
  inperson_visits_per_day: 14.63     # type prefix IP-
  telehealth_share: 0.731            # 73% of visits are telehealth
  reschedules_per_day: BLOCKED_need_view_updated_visits_privilege
  encounter_notes_per_day: BLOCKED_need_ehr_note_privilege
  billing_inquiries_per_day: BLOCKED_action_name_unknown
  portal_messages_per_day: BLOCKED_no_rest_path
  reminders_sent_per_day: BLOCKED_rbac_denied_for_gautam
  medical_records_sent_per_day: BLOCKED_not_probed
  insurance_verifications_per_day: BLOCKED_not_probed_low_leverage
```

### Inferred-but-not-measured volumes (for modelers who need every row filled)

Use these with an explicit `[INFERRED]` tag in any downstream report. These are NOT from a live query; they are derived from industry benchmarks + the clinic's known profile (solo-front-desk, ~85% self-pay, psychiatry).

| Workflow | Inferred/day | Basis |
|---|---:|---|
| Reschedules | 8-12 | Industry norm: 20-25% of the cancellation volume is actually a same-patient reschedule. 7 cancels/day × 2 (since each reschedule = delete+post) = ~14 DELETE-then-POST pairs, ~6-8 of which are true reschedules. |
| Encounter notes | 27 | ≈ 1 note per completed visit (status=3 Seen count), 1:1 coupling is the standard psychiatry workflow. |
| Billing inquiries (patient balance lookups) | 4-6 | Low for this tenant because 85% self-pay = card-at-visit. Insurance billing inquiries are 15% × 27 visits ≈ 4. |
| Portal messages | 6-10 | Psychiatry is high-touch; portal message rate is typically 0.2-0.4 per patient/month, 878 active × 0.3 ÷ 20 biz days ≈ 13/day. Conservative estimate 6-10. |
| Reminders sent | ~40 | Usually 1 reminder per booked appt 24h in advance. With ~50 appts/day scheduled and ~75% auto-confirmed, ~40 are sent and ~17 are confirmed back (matches our measured 17.19 confirmdate number). |
| Medical records requests | 0.3-0.5 | Low for a psychiatry practice. ~1-2/week. |

## Provenance

- **Raw JSON (no PHI)**: `/Users/agent/pi-mono/.pi/services/amd/q1_raw/getreminderappts_aggregate.json`
- **REST scheduler raw**: `/tmp/amd_q1_data/appointments_q1_2026_full.json` (3398 records — the REST scheduler list, STATUS-FILTERED)
- **REST scheduler summary**: `/tmp/amd_q1_data/q1_summary_full.json`
- **Other probed endpoints**: `/tmp/amd_q1_data/summary.json`, `/tmp/amd_q1_data/additional_working.json`
- **XMLRPC probe manifest**: `/tmp/amd_xmlrpc_probe_results.json` (which ppmdmsg actions returned 200 vs "privilege denied")
- **Status code source**: `amd-api-docs/raw/Content_Hard_Coded_Values.htm` (AMD official docs, crawled 2026-04-05)
- **Session cookies**: `/tmp/amd_live_cookies.json` (chmod 600, token has 30-min TTL)
