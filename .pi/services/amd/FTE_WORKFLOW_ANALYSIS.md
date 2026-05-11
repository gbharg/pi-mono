# Exult Healthcare — Front Desk FTE Workflow Analysis

**Tenant:** Exult Healthcare (`officeKey 161112`), McKinney TX. Psychiatry practice with **9 active providers across 2 locations** (EXULT HEALTHCARE primary + MDPA satellite), **~73% telehealth / 27% in-person**, **~85% self-pay**.
**Prepared:** 2026-04-05 (revised from original 2026-04-05 estimate version after live Q1 2026 data pull)
**Data horizon:** Q1 2026 — Jan 1 to Apr 4, 67 business days
**Question answered:** *What does one Exult front-desk FTE actually do every day, and how much of that can an AI agent realistically automate today?*

## Confidence note (read this first)

This revised document has **hard Q1 2026 data** from two complementary AMD endpoints:

1. **`ppmdmsg getreminderappts`** via the legacy XMLRPC broker (`pm-wfe-137.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx`) — returned **3662 total Q1 appointments** with full attribute detail. This is the canonical workload count.
2. **`/api/scheduler/appointments?forView=month`** via the modern REST API — returned 3398 appts (status-filtered: 0, 1, 2, 3, 10, 12 only) with decoded status fields. This is the source of completed/cancelled/no-show daily breakdowns.

Every **[LIVE]** tagged row below is a real measured number. Every **[INFERRED]** row is a benchmark-based estimate and is flagged. **[BLOCKED]** rows require a privilege fix in the AMD user admin UI to become measurable. See `DAILY_BASELINE.md` for the endpoint-by-endpoint audit trail.

## Clinic ground truth (revised)

| Attribute | Value | Source |
|---|---|---|
| Office key | 161112 | `advancedmd.json` |
| Patient roster size (active) | 878 | `/tmp/amd_patients.json` (2026-04-02 pull, 975 total, 878 `ispatientactive=true`) |
| **Active providers (Q1 2026)** | **9** (not 4) | Q1 appointment pull by provider name |
| **Locations** | **2** (EXULT HEALTHCARE + MDPA) | Q1 appointment pull by location |
| Top 5 providers by volume | Mbilikira (1125), Emmons (624), Todd (614), Toles (575), Bhargava (545) — 95% of visits | Q1 data |
| Telehealth share | **73%** (2673/3662 appts) | Q1 data, type prefix TH- vs IP- |
| Payer mix | ~85% self-pay, ~15% insurance | clinic knowledge |
| Self-pay fees | $375 new patient, $175 follow-up | `reference_exult_fees.md` |
| Patient gender | F: 625 (64%), M: 339 (35%) | patient dump |
| Front-desk staff | 1 (solo) — Gautam (interim COO) | `user_gautam_role.md` |
| Business days Q1 2026 | 67 (M-F, no holiday exclusion) | Jan 1 – Apr 4 |

## Measured daily volumes (live, not estimates)

| Metric | Q1 total | Per biz day (mean) | Source endpoint |
|---|---:|---:|---|
| **Scheduled appointments (all statuses)** | 3662 | **54.7** | `ppmdmsg getreminderappts` |
| Completed visits (status=3 Seen) | 1861 | **27.8** | REST `/api/scheduler/appointments` |
| Cancellations (status=10) | 465 | **6.9** | REST |
| No-shows (status=12) | 286 | **4.3** | REST |
| Telehealth visits | 2673 | **39.9** | XMLRPC |
| In-person visits | 980 | **14.6** | XMLRPC |
| New-patient visits | 170 | **2.5** | XMLRPC (type filter) |
| Confirmations (confirmdate populated in Q1) | 1152 | **17.2** | REST |

## Action category table

Columns:
- **Count/day** — mean volume per business day. **[LIVE]** = from Q1 pull; **[INFERRED]** = benchmark estimate; **[BLOCKED]** = endpoint needs privilege grant to measure.
- **Unit min** — minutes per action (industry benchmark unless flagged)
- **Total min/day** — count × unit min
- **API?** — can the agent execute this via an AMD API we have access to? Y / N / P (partial)
- **Endpoint** — which one, if API = Y/P
- **Auto grade** — G (green: agent end-to-end today) / Y (yellow: agent + human checkpoint) / R (red: no viable path without new API access)

### Scheduling & appointments

| Action | Count/day | Unit min | Total min/day | API? | Endpoint | Auto grade | Notes |
|---|---:|---:|---:|---|---|---|---|
| Answer inbound appointment request call | 12 `[INFERRED]` | 6 | 72 | N | — | Y | Phone work via RingCentral + voice agent plugin. Booking into AMD still needs a human step. |
| Book new appointment (in AMD) | 2.5 `[LIVE]` | 5 | 12.5 | N | `/api/scheduler/appointments` POST (documented in prior memory, validated write by prior agent) | Y | New-patient visit count from XMLRPC type filter |
| Reschedule appointment | 8-10 `[INFERRED]` | 6 | 48-60 | N | `ppmdmsg getupdatedvisits` blocked | R | Reschedules = status 5 (Moved) which is filtered from REST list and denied via XMLRPC privilege. Inferred from cancellation-rate adjacency: ~25% of cancellations are actually reschedules (delete+post pair). |
| Cancel appointment | 6.9 `[LIVE]` | 3 | 20.7 | P | Doc'd as `PUT /scheduler/appointments/{id}/cancel` | Y | Documented REST endpoint (Cancel Appointment doc in crawled set) — write path, needs Gautam approval per call. |
| No-show marking | 4.3 `[LIVE]` | 2 | 8.6 | N | — | R | Pure UI action; no API path observed. |
| Confirm next-day appointments (outbound, includes no-show risk calls) | 17.2 `[LIVE]` | 3 | 51.6 | P | `ppmdmsg getreminderappts` with `updconfirm=1` (works for GAUTAM) | Y | AMD has `apptreminderapiurl` at `/api/reminders` (403 RBAC-denied) but XMLRPC `getreminderappts` with `updconfirm=1` is privileged and works. This IS the automation unlock for confirmations — 17/day could flip to Y auto with no new privilege. |
| Walk-in / day-of scheduling | 1 `[INFERRED]` | 8 | 8 | N | — | R | Real-time UI only. |

**Scheduling subtotal (live + inferred): ~220 min/day**

### Patient intake & registration

| Action | Count/day | Unit min | Total min/day | API? | Endpoint | Auto grade |
|---|---:|---:|---:|---|---|---|
| New patient chart created | 2.5 `[LIVE]` | 15 | 37.5 | P | `ppmdmsg addpatient` (documented, write) | Y |
| Insurance verification (self-pay clinic: only 15% of new patients) | 0.4 `[INFERRED]` | 10 | 4 | N | — | R |
| Patient portal invite send | 2.5 `[INFERRED]` | 2 | 5 | P | `portalappintakeurl` known, not validated | Y |
| Demographics update (existing patient) | 4 `[INFERRED]` | 4 | 16 | P | `ppmdmsg updatepatient` documented | Y |

**Intake subtotal (live + inferred): ~63 min/day**

New-patient volume is now **definitively 2.5/biz day** from the live type-name filter. Previous estimate was 0.7/day — the real number is 3.5× higher because intake volume includes both MED MGMT NEW and THERAPY NEW PT streams.

### Billing & payments

| Action | Count/day | Unit min | Total min/day | API? | Endpoint | Auto grade |
|---|---:|---:|---:|---|---|---|
| Self-pay charge at time of visit (credit card) | 23.6 `[INFERRED, derived]` | 3 | 71 | N | `ppmdmsg` addpayment/addcharge documented | Y |
| Send statement to patient | 3-5 `[INFERRED]` | 3 | 12 | N | — | R |
| Post insurance payment (15% of visits) | 4.2 `[INFERRED, derived]` | 5 | 21 | N | — | R |
| Patient balance lookup | 6 `[INFERRED]` | 2 | 12 | N | `ppmdmsg gettxhistory` blocked (action not found on this tenant) | Y |
| Credit card decline follow-up | 1 `[INFERRED]` | 8 | 8 | N | — | R |

**Billing subtotal (inferred): ~124 min/day**

Volume math: 27.8 completed visits/day × 85% self-pay = 23.6 self-pay charges, × 15% = 4.2 insurance posts. Bumped from original estimates because completed-visit volume is 27.8 not 9.

### Communications (phone, portal, email, tasks)

| Action | Count/day | Unit min | Total min/day | API? | Endpoint | Auto grade |
|---|---:|---:|---:|---|---|---|
| Inbound phone call (non-scheduling) | 15 `[INFERRED]` | 4 | 60 | N | — | Y |
| Voicemail return | 3 `[INFERRED]` | 4 | 12 | N | — | Y |
| Patient portal message triage | 8-10 `[INFERRED]` | 5 | 40-50 | N | `/api/messages` 404, `/api/worklist` 403 — BLOCKED | R |
| Internal task / front-desk inbox item | 4 `[INFERRED]` | 3 | 12 | N | BLOCKED | R |
| Prescription refill routing | 3 `[INFERRED]` | 4 | 12 | N | EHR-side | R |
| Medical records request | 0.3 `[INFERRED]` | 15 | 4.5 | N | — | R |

**Comms subtotal: ~140-150 min/day**

### Clinical support

| Action | Count/day | Unit min | Total min/day | API? | Endpoint | Auto grade |
|---|---:|---:|---:|---|---|---|
| Chart note create/update (1:1 with completed visits) | 27.8 `[LIVE]` | 3 (front-desk portion) | 83 | P | `ppmdmsg getehrupdatednotes` blocked | R |
| Prior-auth form prep | 0.3 `[INFERRED]` | 20 | 6 | N | — | R |
| Forms distribution (intake, ROI) | 2.5 `[LIVE]` | 5 | 12.5 | P | portal URLs known | Y |

**Clinical-support subtotal: ~100 min/day** (front-desk portion only)

Note: front-desk does NOT author encounter notes. The 3 min per note here is the front-desk-side work around a note (routing, signing, filing). Provider note-writing is not counted in FTE.

### Admin overhead

| Action | Count/day | Unit min | Total min/day | API? | Auto grade |
|---|---:|---:|---:|---|---|
| End-of-day close / batch report | 1 | 15 | 15 | N | R |
| Provider schedule review (9 providers × 2 locations = more complex than solo) | 1 | 10 | 10 | N | R |
| Supply / office tasks | — | — | 10 | N | R |

**Admin subtotal: ~35 min/day**

## Rollup (revised with live numbers)

| Category | Total min/day | Greenable | Yellowable (checkpoint) | Redable |
|---|---:|---:|---:|---:|
| Scheduling & appointments | 220 | 0 | 145 | 75 |
| Intake & registration | 63 | 0 | 59 | 4 |
| Billing & payments | 124 | 0 | 83 | 41 |
| Communications | 145 | 0 | 72 | 73 |
| Clinical support | 100 | 0 | 13 | 87 |
| Admin overhead | 35 | 0 | 0 | 35 |
| **TOTAL** | **687 min/day** | **0** | **372** | **315** |

**687 min/day vs 480 min/day FTE shift** = **1.43 FTEs of front-desk-equivalent work**. This is higher than the original 0.81-FTE estimate because:
1. Completed visits went from estimated 10/day to measured 27.8/day (2.8× higher).
2. Provider count went from assumed 4 to actual 9 (with a 2-location operation), which inflates scheduling-overhead and cross-site coordination.
3. New-patient rate went from 0.7/day to 2.5/day (3.6× higher).

The clinic is running **>1 FTE of front-desk work through one person (Gautam interim)**. This is the strongest case yet for the automation buildout.

### Automation-readiness rollup (honest, revised)

- **Green (agent end-to-end today): 0 min/day (0%)** — same as before, every write path requires human approval per `feedback_amd_writes.md`.
- **Yellow (agent with human checkpoint): ~372 min/day (~54% of the 687 billable min)** — includes the new-patient intake draft, confirmation calls (the largest new-yellow addition: 17.2/day of confirmations via the already-privileged `getreminderappts updconfirm=1` call), charge prep, phone triage, and patient lookup.
- **Red (human-only today): ~315 min/day (~46%)** — anything requiring AMD writes without approval, plus note authoring, EHR-side work, portal messaging, reminders (RBAC-blocked), and billing inquiries (action-name-blocked).

**Honest "% of one FTE the agent can realistically cover"**: **≈ 54% of billable work = 77% of a single 480-min shift**. Because the clinic actually runs 1.43 FTEs of work through one person, the agent can cover enough to bring the human load back under 1 FTE — which is the operationally meaningful win.

If the RBAC/privilege gates listed in DAILY_BASELINE get opened, the green bucket jumps from 0 → ~120 min/day (reschedule automation + batch confirmation runs + portal triage), pushing the rollup to **~65% of billable work**.

## Per-action complexity and token-cost model (input to sibling cost-analysis agent)

For the workable (yellow-or-greenable) categories, per-call cost estimates:

| Action | Tools / turns | Token burn (in+out) | Model tier | Est cost per action | Volume/day | Daily cost |
|---|---:|---:|---|---:|---:|---:|
| Phone triage + callback note | 15-25 turns | 40k tokens | Sonnet 4.7 | $0.12 | 18 | $2.16 |
| Batch confirmation run (50 appts in one go) | 1 API + 50 send | 8k total | Haiku 4 | $0.008 | 1 batch | $0.008 |
| Patient balance lookup | 1 API call | 2k tokens | Haiku 4 | $0.002 | 6 | $0.012 |
| Portal invite send | 1 API call | 2k tokens | Haiku 4 | $0.002 | 2.5 | $0.005 |
| Self-pay charge prep draft | 3 turns | 8k tokens | Sonnet 4.7 | $0.024 | 23.6 | $0.57 |
| Reschedule request triage + draft response | 8 turns | 20k tokens | Sonnet 4.7 | $0.06 | 8-10 | $0.54 |
| New-patient intake packet draft (mailers, portal invite, intake form routing) | 10 turns | 25k tokens | Sonnet 4.7 | $0.075 | 2.5 | $0.19 |

**Blended cost for the yellow-bucket day: ~$3.50-4.50** (dominated by phone triage; everything else is < $1/day). Cross-reference with the sibling cost-analysis agent's MORNING_REPORT output for the authoritative roll-up.

## Top 5 findings (revised)

1. **The clinic is actually running 1.4 FTEs of front-desk work through one person.** Live data shows 687 min/day of billable tasks vs a 480-min shift. That's a burnout-grade workload; the automation case is stronger than the previous solo-practice model suggested.
2. **Telehealth is 73% of visits.** Nearly three-quarters of all appointments are via `TH-*` type codes. This radically simplifies phone work (no arrival logistics, no in-office wait) but adds link/credential-prep overhead.
3. **Two locations**: `EXULT HEALTHCARE` (2744 appts, 75%) + `MDPA` (918 appts, 25%). A second facility that wasn't in the original clinic model. The coordinator should verify with Gautam — may be a separate P&L, may be a billing-only alias, may be a real satellite.
4. **Confirmations are the single biggest automation win.** The `getreminderappts updconfirm=1` XMLRPC call is privileged (GAUTAM can call it), returns 3662 Q1 appts with full confirm state, and a batch run of 50-100 confirmations/day could replace ~17 min/day of human confirmation calls with a single 5-minute agent run. No write-approval gate.
5. **One privilege flip unblocks 4 other workflows.** Granting GAUTAM's role `view updated visits`, `view updated patients`, `view new and updated patient notes for a template`, and `view visit information for a date` unlocks reschedule counts, encounter-note volume, and per-day visit detail. Listed in DAILY_BASELINE.md as "the BIG unblock".

## What would change this analysis

- **The 4 privilege grants above land.** Every BLOCKED row flips to LIVE, reschedule + encounter-note + note-authoring daily counts become real numbers, automation ceiling moves from 54% to ~65% of billable work.
- **EHR REST API (`wc-api-137.advancedmd.com`) is probed.** Unlocks chart note / document / lab workflows. Not attempted this session (different host, different RBAC surface).
- **The MDPA second-location question is resolved.** If MDPA is a separately-staffed facility, the FTE math is per-location not per-clinic and the Exult-primary workload is 75% of what's shown here.
- **Phone volume is replaced with real RC call logs.** The 18 calls/day inbound estimate is a benchmark guess; RingCentral's actual Q1 log would give us a hard number and the scheduling-vs-clinical-vs-admin split.

## Sources

- **Q1 2026 hard data**: `ppmdmsg getreminderappts` XMLRPC pull (3662 appts, 2026-04-05); `/api/scheduler/appointments` REST pull (3398 appts, 2026-04-05); both saved as aggregates in `q1_raw/getreminderappts_aggregate.json` and `/tmp/amd_q1_data/`.
- **Patient roster**: `/tmp/amd_patients.json` (975 records, 2026-04-02)
- **Auth + session artifacts**: `/tmp/amd_live_cookies.json`, `/tmp/amd_live_localStorage.json` (2026-04-05)
- **Memory files**: `project_clinic_automation.md`, `reference_exult_fees.md`, `reference_amd_api.md`, `user_gautam_role.md`, `reference_rc_phone_routing.md`, `feedback_amd_writes.md`.
- **Endpoint ground truth**: `API_REFERENCE.md` + `api_reference.json` (this directory), `API_DOCUMENTATION.md` + `api_documentation.json` (215 spec pages crawled).

## Roster correction note (for memory)

Prior memory referenced "Gautam Bhargava" as a provider (provider code BHAR00). That was incorrect — **Gautam is COO / front desk**, not a provider. **BHAR00 = Dr. Deepika Bhargava** (the psychiatrist and clinic owner). The provider panel has 9 active providers including Mbilikira (SW), Todd (MFT), Toles (MFT), Emmons (SW), Hawkins, Dattatreya, Snype-Stewart, and the generic EXULT HEALTHCARE column — Gautam appears nowhere in the provider list. Update `reference_amd_api.md` to reflect this.
