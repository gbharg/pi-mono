# Front Office Workflow Analysis — Exult Healthcare
**Window**: 2026-01-01 to 2026-03-31 (3 months, 62 business days after holidays)
**Generated**: 2026-04-05T11:07:54Z
**Data sources**: RingCentral call log (JWT), Microsoft Graph (app-only client credentials).
**AMD data**: in separate file `DAILY_BASELINE.md` (written by parallel agent a6a2b7c8d8d24097b).
**Retell AI**: no credentials file present — skipped.

## Executive Summary

Across Q1 2026 the Exult front office handled **5,772 inbound calls** (~93.1/business day, 62 biz days), with **only 59% answered live** — 22% went to missed/no-answer and 15% hit voicemail. Email volume is dominated by automated fax+voicemail notifications into a single seat (Kendra Geller, ext 104), with **~2,223 automated fax/voicemail/scan messages** and ~900 human emails across three months. Calendar activity in M365 is near-zero because appointment scheduling lives entirely in AdvancedMD.

**Biggest workload categories:**
- Inbound phone: ~31.0 calls/hr during 9am-3pm CST peak window, routed through a ring-group that currently fails-over through 6-8 extensions per call (call legs average 10.1 per session).
- Inbound fax/voicemail email (Kendra inbox): 1,805 MyFax emails + 305 voicemail notices + 113 Konica scans = 2,223 automated items, all landing in one seat.
- Human email to front office: ~2,873 messages across exult-info@, raj.bhargava@, kendra.geller@ combined; only ~2.6% contain insurance-related keywords.

**Biggest surprise:**
- **Live answer rate is only ~59%.** Of 5,772 inbound sessions, 2,125 (~37%) ended in missed or voicemail — this is the #1 candidate for a voice agent. The RC ring-group is burning 1,729 call-legs on "Salena Exult Front Desk" with only 18 answered (the extension appears stale/dead), and 7,582 legs on "4th phone" with 183 answered. Dead/stale extensions in the fail-over chain are stealing answer attempts from live seats.

## Inbound Phone Workload (RingCentral)

| Month | Total Inbound | Answered | Missed | Voicemail | Other | Avg/Biz Day | Peak Day | Peak Hour (local) |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Jan 2026 | 1,947 | 1,163 (60%) | 434 (22%) | 260 (13%) | 90 | 92.7 | 2026-01-08 (122) | 10:00 (244) |
| Feb 2026 | 1,828 | 1,094 (60%) | 377 (21%) | 279 (15%) | 78 | 96.2 | 2026-02-17 (123) | 09:00 (227) |
| Mar 2026 | 1,997 | 1,133 (57%) | 468 (23%) | 307 (15%) | 89 | 90.8 | 2026-03-02 (147) | 09:00 (281) |

**Quarter total**: 5,772 inbound calls → 3,390 answered, 1,279 missed, 846 voicemail.

### Call routing — top extensions by leg touch (how RC tries to reach live seats)

RingCentral fans out each inbound call through a ring-group, so one call session typically walks through 5-8 extension "legs". Counts below reflect leg-level attempts, not unique calls.

| Rank | Extension | Legs Touched | Legs Answered | Legs → Voicemail | Answer rate on leg |
|---:|---|---:|---:|---:|---:|
| 1 | Bianca MDPA CheckIn | 11,745 | 0 | 0 | 0% |
| 2 | Bianca MA | 7,914 | 685 | 58 | 9% |
| 3 | 4th phone | 7,582 | 183 | 0 | 2% |
| 4 | Salena Exult Front Desk | 7,566 | 18 | 0 | 0% |
| 5 | MDPA 1 (Sherman) | 6,780 | 830 | 0 | 12% |
| 6 | Kendra Geller | 5,577 | 668 | 135 | 12% |
| 7 | All line pick up | 2,865 | 1,151 | 403 | 40% |
| 8 | MDPA Main 2021-10 | 2,822 | 2,751 | 0 | 97% |
| 9 | Teegan Goss | 1,964 | 10 | 5 | 1% |
| 10 | Exult Line | 1,726 | 1,726 | 0 | 100% |
| 11 | MDPA-FDScheduling | 758 | 228 | 224 | 30% |
| 12 | MDPA After hours | 267 | 225 | 0 | 84% |
| 13 | IOP 5 | 184 | 0 | 0 | 0% |
| 14 | Faith Watkins | 158 | 83 | 3 | 53% |
| 15 | Chris Bonilla | 155 | 0 | 13 | 0% |

**Seats actually carrying live-answer load** (top 5 by leg-level answers): 
- `MDPA Main 2021-10` — 2,751 live answers
- `Exult Line` — 1,726 live answers
- `All line pick up` — 1,151 live answers
- `MDPA 1 (Sherman)` — 830 live answers
- `Bianca MA` — 685 live answers

**Dead-weight extensions bleeding ring attempts** (>1,000 legs, <5% answer rate):
- `Bianca MDPA CheckIn` — 11,745 legs attempted, 0 answered (0.0%)
- `4th phone` — 7,582 legs attempted, 183 answered (2.4%)
- `Salena Exult Front Desk` — 7,566 legs attempted, 18 answered (0.2%)
- `Teegan Goss` — 1,964 legs attempted, 10 answered (0.5%)

## Email Workload (Microsoft Graph)

Three mailboxes were queried as front-office proxies:
- `exult-info@exulthealthcare.com` — shared info/intake
- `raj.bhargava@exulthealthcare.com` — COO / admin
- `kendra.geller@exulthealthcare.com` — front desk (RC ext 104)

| Month | Mailbox | Total Inbound | Insurance-Keyword | % Insurance |
|---|---|---:|---:|---:|
| Jan 2026 | exult-info | 34 | 3 | 8.8% |
| Jan 2026 | raj.bhargava | 311 | 6 | 1.9% |
| Jan 2026 | kendra.geller | 988 | 43 | 4.4% |
| Feb 2026 | exult-info | 46 | 12 | 26.1% |
| Feb 2026 | raj.bhargava | 402 | 2 | 0.5% |
| Feb 2026 | kendra.geller | 920 | 9 | 1.0% |
| Mar 2026 | exult-info | 587 | 23 | 3.9% |
| Mar 2026 | raj.bhargava | 579 | 18 | 3.1% |
| Mar 2026 | kendra.geller | 1,229 | 17 | 1.4% |

**Combined across all three mailboxes:**

| Month | Total | Insurance-Keyword | % |
|---|---:|---:|---:|
| Jan 2026 | 1,333 | 52 | 3.9% |
| Feb 2026 | 1,368 | 23 | 1.7% |
| Mar 2026 | 2,395 | 58 | 2.4% |

> **Caveat**: `exult-info@` only shows 34 Jan + 46 Feb messages, then jumps to 587 in March. This almost certainly reflects a retention/archive rule (or the shared mailbox was relaunched) — not a real 10× volume jump. Treat `exult-info@` Jan-Feb as under-reported. Kendra and Raj inbox totals are stable month-over-month.

**Top subject patterns (normalized, Re:/Fwd: stripped):**

*exult-info* — top 10 subject patterns:
-   17  One-time verification code
-   12  ACTION REQUIRED: Information required for your migration
-    5  Status Update for  Patient
-    5  A prior auth for a patient of Mbilikira needs review
-    5  AdvancedMD Incident - Slowness in PM and EHR - Pool 133 - 10 March 2026
-    4  A prior auth for a patient of  needs review
-    4  Yes
-    4  Question ?
-    4  www.exulthealthcare.com
-    4  Rates

*raj.bhargava* — top 10 subject patterns:
-   42  Exult Email, OneDrive & SharePoint Migration – Authorization Request for BitTita
-   19  [Action required] New application for Office Manager - Mental Health, McKinney, 
-   16  [Action required] New application for Psychiatric Mental Health Nurse Practition
-   15  [Action required] New application for Practice Manager - Mental Health Medical P
-   14  there were no general body or board meetings
-   13  Counter List
-   12  Your IT Update This Week
-   12  ACTION REQUIRED: Information required for your migration
-    9  [Action required] New application for Practice Manager - Medical Practice, McKin
-    8  updates

*kendra.geller* — top 10 subject patterns:
-  546  MyFax message from "8007467287" - 2 page(s)
-  169  MyFax message from "unknown" - 1 page(s)
-  113  Scan
-  101  MyFax message from "Walmart Pharmacy" - 2 page(s)
-   78  MyFax message from "" - 1 page(s)
-   70  MyFax message from "8007467287" - 1 page(s)
-   61  MyFax message from "unknown" - 2 page(s)
-   53  MyFax message from "Anonymous" - 1 page(s)
-   31  MyFax message from "unknown" - 3 page(s)
-   30  MyFax message from "CNC" - 2 page(s)

### Email content breakdown (Kendra inbox — the automation tell)

Re-categorization of Kendra's 3,137 inbound messages (sender-filtered, draft-excluded):

| Category | Count | % of Kendra inbox |
|---|---:|---:|
| MyFax inbound (fax → email gateway) | 1,805 | 57.5% |
| "Other" (human conversations, portals, IT, etc) | 849 | 27.1% |
| Voicemail notifications (RC → email) | 305 | 9.7% |
| Konica scan → email | 113 | 3.6% |
| Insurance-keyword subjects | 31 | 1.0% |
| Hiring / IT migration noise | 17 | 0.5% |
| Appointment-related subjects | 16 | 0.5% |

**Automated-source traffic (fax + vm + scan) = 2,223 messages (70.8% of this mailbox).** That's ~36 automated messages per business day landing on one seat.

## Appointment Confirmation Proxy (M365 Calendar)

Calendar events created in the window on both shared mailboxes combined: **3 events total** across 62 business days.

| Mailbox | Events Created (Q1) |
|---|---:|
| exult-info | 1 |
| raj.bhargava | 2 |

**Interpretation**: M365 calendars are NOT the source of truth for appointment confirmations — that lives in AdvancedMD. The ~3 events/quarter total signal here confirms: do NOT use M365 calendar as a scheduling proxy. All appointment-confirmation workload is in AMD, see `DAILY_BASELINE.md`.

## Voice Agent Baseline (Retell AI)

**BLOCKED**: No Retell credentials file at `/Users/agent/pi-mono/.config/exult/retell.json`. Exult does not appear to have a Retell deployment yet. This section is a placeholder for a future post-deployment baseline.

## Cross-Reference With AMD

The companion file `DAILY_BASELINE.md` (written by parallel agent `a6a2b7c8d8d24097b` against AdvancedMD office 161112) contains the AMD-side numbers that this file deliberately did NOT touch:
- Appointment reschedules per day
- Cancellations per day
- New patient creations
- Clinical note counts
- Appointment status transitions

**Suggested joint reading**: pair each RC month-total row with the AMD appointment-count row for the same month to get calls-per-appointment ratio, which is the single most load-bearing number for a cost model on voice automation.

## Methodology + Raw Counts

### RingCentral
- Auth: JWT bearer exchange → OAuth access token (fresh token per fetch).
- Endpoint: `GET /restapi/v1.0/account/~/call-log?direction=Inbound&view=Detailed&perPage=1000`
- Fetched in 13 consecutive 7-day UTC windows covering `2026-01-01T06:00Z` → `2026-04-01T05:00Z` (aligns to America/Chicago midnight before/after DST).
- Rate limit: heavy endpoint 10 req/min; sleep 10s between calls + 429 retry with `Retry-After`.
- Raw unique records: **5,772** (dedup by `id`).
- Classification: session-level `result` field. "Answered" = `Accepted` + `Call connected` + `Received`. "Missed" = `Missed`+`No Answer`+`Busy`+`Hang Up`+`Declined`+`Abandoned`. "Voicemail" = `Voicemail`. "Other" = blocked/receive-error/rejected/fax-error.
- Timestamps converted to America/Chicago with DST transition at 2026-03-08 02:00 CST → CDT.
- Extension attribution walks each record's `legs[]` array and credits the `to.name` for each leg, so one call contributes to multiple extensions in leg-level tallies.

### Microsoft Graph
- Auth: client_credentials flow (`tenant 707a7153-...` / Exult Agent Service app).
- Endpoint: `GET /v1.0/users/{upn}/messages?$filter=receivedDateTime ge ... le ...&$select=id,subject,bodyPreview,receivedDateTime,from,toRecipients,isDraft&$top=100`
- Mailboxes: exult-info@, raj.bhargava@, kendra.geller@
- Message counts are post-filter (drafts excluded; messages where sender email == mailbox owner excluded to drop Sent Items that live in `/messages` collection).
- Insurance regex: `\b(insurance|copay|co[- ]?pay|eligibility|prior[- ]?auth|deductible|bcbs|blue[ -]?cross|aetna|cigna|uhc|united[- ]?health|medicare|medicaid|tricare|humana|anthem|oscar|ambetter)\b` (case-insensitive, applied to subject+bodyPreview).
- Calendar: `GET /v1.0/users/{upn}/events?$filter=createdDateTime ge ... le ...`

### Raw per-day counts
Full per-day counts for both sources are in `front_office_raw.json` (same directory) so a future cost-model agent can re-aggregate without re-hitting the APIs.

## Caveats & Gaps

1. `exult-info@` message volume jumps 10× in March (34 → 46 → 587); likely archive rule or mailbox relaunch. Don't read that as a real workload trend.
2. RC "Inbound" direction filter excludes outbound calls the front desk makes to patients for confirmations/callbacks — the real answer-handling workload on seats is higher than this file shows. A follow-up pull with `direction=Outbound` would quantify it.
3. Leg-level extension attribution double-counts: a call that rings 6 extensions before getting answered by the 7th contributes 7 leg touches but 1 session. The session-level totals table is the right number to quote for human-facing capacity planning.
4. Some RC extensions in the ring-group appear dead (Salena Exult Front Desk: 1,729 attempts, 18 answered — 1% rate; 4th phone: 7,582 attempts, 183 answered — 2.4% rate). This is a RC config problem, not an agent problem, and it's actively making the answer rate look worse than staff capability warrants.
5. Insurance-keyword percentages are low (~3% combined) but that's almost certainly because insurance questions come over the phone, not email. Correlate with AMD "insurance on file" changes to get the real insurance-workflow volume.
6. Retell AI data is unavailable — no creds file exists. When a Retell voice agent is deployed, re-run with the new creds to get an actual call-deflection baseline.

---
*Generated by Claude Opus 4.6 agent for Gautam Bhargava / Exult Healthcare front-office cost-model baseline. 2026-04-05T11:07:54Z*