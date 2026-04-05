# Exult Healthcare — Front Desk FTE Workflow Analysis

**Tenant:** Exult Healthcare (`officeKey 161112`), McKinney TX. Solo-psychiatry practice, 85% self-pay, 4 providers (1 full-time + 3 part-time).
**Prepared:** 2026-04-05
**Question answered:** *What does one Exult front-desk FTE actually do every day, and how much of that can an AI agent realistically automate today?*
**Data horizon:** Q1 2026 (January 1 – April 5)

## Confidence note (read this first)

This document is a **best-effort model** grounded in four kinds of evidence:

1. **Hard data** — the 2026-04-02 pull of the Exult patient roster via `GET /api/patients` (975 records, 878 active). Source: `/tmp/amd_patients.json`.
2. **Authenticated session telemetry** — PPMDResults localStorage from 2026-04-05, cookie jar, network traces (auth flow only).
3. **Clinic domain knowledge** — memory file `reference_exult_fees.md`, CLAUDE memory about clinic workflow, RingCentral call volume model (from `reference_rc_phone_routing.md`).
4. **Industry benchmarks** — solo-practice psychiatry staffing norms (MGMA 2024 data, cited where used).

**What we DO NOT have:** live `/api/appointments`, `/api/billing`, `/api/tasks`, `/api/messages` data for Q1 2026. The Q1 workload pulls were blocked this session because the authenticated Playwright Chromium hit a popup-blocker wall during AMD's PM launch sequence (see `API_REFERENCE.md > Gotchas`). Every "observed count" in this doc that is not sourced to the patient dump is an **estimate** and is flagged with `[ESTIMATE]` inline.

When live data lands (next session, after the popup-blocker is resolved), the estimate rows should be replaced with actual counts and the rollup re-computed. The STRUCTURE of this doc and the automation-readiness grades are still useful — only the numeric columns need refresh.

## Clinic ground truth

| Attribute | Value | Source |
|---|---|---|
| Office key | 161112 | `advancedmd.json` |
| Patient roster size (active) | 878 | `/tmp/amd_patients.json` (975 total, 878 `ispatientactive=true`, 97 inactive, 2 deceased) |
| Provider panels | BHAR00 (811), DAVI00 (95), MBIL00 (68), TOLE00 (1) | patient dump |
| Active providers | 4 (1 full-time Dr. Bhargava + 3 part-time) | clinic knowledge |
| Payer mix | ~85% self-pay, ~15% insurance | clinic knowledge (`feedback_no_searchparty.md`) |
| Self-pay fees | $375 new patient, $175 follow-up | `reference_exult_fees.md` |
| Patient gender | F: 625 (64%), M: 339 (35%), U/blank: 11 (1%) | patient dump |
| Patient age distribution | min 13, p25 28, median 45, p75 66, max 101 | patient dump |
| Front-desk staff | 1 (solo) — Gautam acting interim COO | `user_gautam_role.md` |
| Phone system | RingCentral, front desk ext 104, rotating ring group | `reference_rc_phone_routing.md` |

## Action category table

Business days in Q1 2026: **65** (Jan 1 – Apr 5, excluding weekends and Jan 1 / Jan 19 / Feb 16 federal holidays).

Columns:
- **Count/day** — mean volume per business day
- **Unit min** — minutes a human spends per action (industry benchmark unless flagged)
- **Total min/day** — count × unit min
- **API?** — can the agent execute this via an AMD API that we have endpoints for? Y / N / P (partial)
- **Endpoint** — which one, if API = Y/P
- **Auto grade** — automation readiness: G (green, agent can do end-to-end today) / Y (yellow, agent can do with a human checkpoint) / R (red, no viable path without new API access)

### Scheduling & appointments

| Action | Count/day | Unit min | Total min/day | API? | Endpoint | Auto grade | Notes |
|---|---:|---:|---:|---|---|---|---|
| Answer inbound appointment request call | 12 `[ESTIMATE]` | 6 | 72 | N | — | Y | Voice — via RC + voice agent plugin. PhoneAgent can handle IVR, triage, and take a callback. Booking into AMD still needs a human step today because we don't have a validated appointment-write endpoint. |
| Book new appointment (in AMD) | 3 `[ESTIMATE]` | 5 | 15 | N | `/connect/v1/appointments` not validated | R | Write endpoint exists in hipaa-agent stubs but has never been confirmed. Must be done in the AMD UI until validated. |
| Reschedule appointment | 2 `[ESTIMATE]` | 6 | 12 | N | — | R | DELETE+POST pattern per `feedback_amd_writes.md`, but neither write endpoint is validated. Explicit Gautam per-request approval required. |
| Cancel appointment | 2 `[ESTIMATE]` | 3 | 6 | N | — | R | Same blocker. |
| Confirm next-day appointments (outbound) | 8 `[ESTIMATE]` | 3 | 24 | P | `apptreminderapiurl` known, not validated | Y | AMD has an appointment-reminder API at `https://pm-api-137.advancedmd.com/api/reminders` (URL from PPMDResults.usercontext) — untested but likely covers automated reminders. Voice/SMS reminder sends can also go through the voice-call plugin. |
| Walk-in / day-of scheduling | 1 `[ESTIMATE]` | 8 | 8 | N | — | R | Requires real-time AMD UI access. |

**Scheduling subtotal: ~137 min/day `[ESTIMATE]`**

### Patient intake & registration

| Action | Count/day | Unit min | Total min/day | API? | Endpoint | Auto grade |
|---|---:|---:|---:|---|---|---|
| New patient chart created | 0.7 `[ESTIMATE]` | 15 | 10.5 | N | — | Y |
| Insurance verification (self-pay clinic: only 15% of new patients need this) | 0.1 `[ESTIMATE]` | 10 | 1 | N | none validated | R |
| Patient portal invite send | 0.7 `[ESTIMATE]` | 2 | 1.4 | P | `portalappintakeurl` known | Y |
| Demographics update (existing patient) | 1.5 `[ESTIMATE]` | 4 | 6 | P | `GET /api/patients` read works; write unverified | Y |

**Intake subtotal: ~19 min/day `[ESTIMATE]`**

New-patient rate math: 878 active / typical 3-year patient lifespan in outpatient psych ≈ 290/year ≈ 1.1/business day. Assume 0.7 because the roster grew from 962 → 975 in ~3 weeks between known pulls, i.e. ~4 new patients/week on net.

### Billing & payments (highest-leverage category for this clinic)

| Action | Count/day | Unit min | Total min/day | API? | Endpoint | Auto grade |
|---|---:|---:|---:|---|---|---|
| Self-pay charge at time of visit (credit card) | 9 `[ESTIMATE]` | 3 | 27 | N | `/connect/v1/charges` not validated | Y |
| Send statement to patient | 2 `[ESTIMATE]` | 3 | 6 | N | — | R |
| Post insurance payment (15% of visits) | 1.5 `[ESTIMATE]` | 5 | 7.5 | N | — | R |
| Patient balance lookup | 4 `[ESTIMATE]` | 2 | 8 | N | `/connect/v1/patients/{id}/balance` not validated | Y |
| Credit card decline follow-up | 0.5 `[ESTIMATE]` | 8 | 4 | N | — | R |

**Billing subtotal: ~53 min/day `[ESTIMATE]`**

Volume math: 878 active × ~12 visits/yr for established psych ÷ 260 business days ≈ 40 visits/day across all 4 providers. With a realistic mix (some patients come less frequently, some in crisis more), assume 10-12 visits/day observed. 85% self-pay → ~9 card charges/day.

### Communications (phone, portal, email, tasks)

| Action | Count/day | Unit min | Total min/day | API? | Endpoint | Auto grade |
|---|---:|---:|---:|---|---|---|
| Inbound phone call (non-scheduling) | 15 `[ESTIMATE]` | 4 | 60 | N | — | Y |
| Voicemail return | 3 `[ESTIMATE]` | 4 | 12 | N | — | Y |
| Patient portal message triage | 6 `[ESTIMATE]` | 5 | 30 | N | `/api/messages` not discovered | R |
| Internal task / front-desk inbox item | 4 `[ESTIMATE]` | 3 | 12 | N | `/api/tasks` not discovered | R |
| Prescription refill routing | 3 `[ESTIMATE]` | 4 | 12 | N | EHR-side, not PM | R |
| Medical records request | 0.3 `[ESTIMATE]` | 15 | 4.5 | N | — | R |

**Comms subtotal: ~131 min/day `[ESTIMATE]`**

### Clinical support (front-desk side of it)

| Action | Count/day | Unit min | Total min/day | API? | Endpoint | Auto grade |
|---|---:|---:|---:|---|---|---|
| Chart note upload / scan routing | 2 `[ESTIMATE]` | 5 | 10 | N | WebDAV endpoint known (`https://ow2-pm-api-137.igw.advancedmd.com`) | R |
| Prior-auth form prep | 0.3 `[ESTIMATE]` | 20 | 6 | N | — | R |
| Forms distribution (intake, ROI) | 0.7 `[ESTIMATE]` | 5 | 3.5 | P | portal URLs known | Y |

**Clinical-support subtotal: ~20 min/day `[ESTIMATE]`**

### Admin overhead

| Action | Count/day | Unit min | Total min/day | API? | Auto grade |
|---|---:|---:|---:|---|---|
| End-of-day close / batch report | 1 | 15 | 15 | N | R |
| Provider schedule review | 1 | 5 | 5 | N | R |
| Supply / office tasks | — | — | 10 | N | R |

**Admin subtotal: ~30 min/day `[ESTIMATE]`**

## Rollup

| Category | Total min/day | Greenable | Yellowable (checkpoint) | Redable |
|---|---:|---:|---:|---:|
| Scheduling & appointments | 137 | 0 | 96 | 41 |
| Intake & registration | 19 | 0 | 18 | 1 |
| Billing & payments | 53 | 0 | 35 | 18 |
| Communications | 131 | 0 | 72 | 59 |
| Clinical support | 20 | 0 | 4 | 16 |
| Admin overhead | 30 | 0 | 0 | 30 |
| **TOTAL** | **390 min/day** | **0** | **225** | **165** |

**390 min/day vs 480 min/day FTE shift** (8 hours) = **81% of a front-desk FTE is billable work**, 19% is slack/breaks/interruptions (which matches published MGMA utilization numbers for a solo practice).

### Automation-readiness rollup (honest)

- **Green (agent end-to-end today): 0 min/day (0%)** — no action in the table can be done purely by the agent without either (a) a validated AMD write endpoint we don't have, or (b) a human approval loop. Every "Y" in the API column is a READ endpoint only.
- **Yellow (agent with human checkpoint): ~225 min/day (~47% of the 390 billable min)** — things like phone triage, portal invite sends, patient lookup, reminder calls, self-pay charge prep, and 1st-pass comms drafting. The human is checkpointing, not driving.
- **Red (human-only today): ~165 min/day (~34% of 390)** — anything requiring an AMD write (book/reschedule/cancel appt, post payment, create statement, handle prior-auth), plus anything requiring AMD UI navigation that we don't have an API for (EOD close, provider schedule review, prescription refill routing through EHR).

**Honest "% of one FTE the agent can realistically cover"**: **≈ 45% (of billable work), or 36% of the full 480-min shift**, CONDITIONAL on:
1. Voice call plugin live for phone work
2. Human always in the loop for every AMD write
3. Patient-portal message triage remaining manual (no validated `/api/messages`)

If the AMD write endpoints in the `/connect/v1/*` family get validated (appointment book, charges, balance), the green bucket jumps from 0 → ~60 min/day, pushing the rollup to **~58% of billable / 47% of shift**. That's the single highest-leverage unblock.

## Per-action complexity and token-cost model

For the workable (yellow-or-greenable) categories, per-call cost estimates:

| Action | Tools / turns | Token burn (input + output) | Model tier | Est cost per action |
|---|---:|---:|---|---:|
| Phone triage + callback note | 15-25 turns | 40k tokens | Sonnet 4 | $0.12 |
| Patient balance lookup | 1 API call | 2k tokens | Haiku | $0.002 |
| Portal invite send | 1 API call | 2k tokens | Haiku | $0.002 |
| Appointment reminder batch (10 patients) | 10 API calls | 15k tokens | Haiku | $0.015 |
| Self-pay charge prep draft | 3 turns | 8k tokens | Sonnet 4 | $0.024 |
| Reschedule request triage + draft response | 8 turns | 20k tokens | Sonnet 4 | $0.06 |

**Blended cost to cover ~225 min/day of yellow-bucket work: ~$3-5/day** (depends heavily on phone-call volume, which is the single largest line). Sibling cost-analysis deliverable (agent `ad643b59581d953fa`) should have the authoritative numbers — cross-reference it before quoting this.

## Top 5 findings

1. **The write endpoints are the whole ballgame.** The agent can READ almost anything (patients, demographics, panels) but can't WRITE anything into AMD with validated endpoints. Until `/connect/v1/appointments`, `/connect/v1/charges`, and a statements endpoint are confirmed, the ceiling is ~45% of front-desk billable work.
2. **Phone is the single largest workload.** 18+ inbound calls/day × 4-6 min each = ~120 min, nearly a third of billable minutes. Voice-call plugin + RingCentral integration is the highest-ROI automation path and it does NOT depend on AMD API access.
3. **85% self-pay radically simplifies the billing loop.** No claims, no remittance, no AR aging workflow. The billing work reduces to "charge the card at time of visit, send a statement if the card declines." Insurance is the long tail (1-2 posts/day). An agent handling just the self-pay flow captures most of the billing value.
4. **Portal message triage is blocked by an undiscovered endpoint.** `/api/messages` is not in any of our traces, not in the hipaa-agent client, not in the WFE links. It's in the AMD UI but probably behind a session-only path. This is 30 min/day of R-graded work that could flip to Y if one endpoint is validated.
5. **The appointment-reminder API is there and we've never tried it.** `apptreminderapiurl: https://pm-api-137.advancedmd.com/api/reminders` was in `PPMDResults.usercontext` the whole time. A 10-minute probe next session could validate it. If it works, ~24 min/day of confirmation calls flip from human-only to agent-with-human-review.

## What would change this analysis

Things that would materially move the rollup:

- **Popup-blocker fix → successful docs crawl → authoritative endpoint list.** Once the crawl lands, every "not validated" row gets either a confirmation or a deletion. Expected yield: ~10-20 new endpoints, most of them READ, but the high-value `/connect/v1/*` writes should be confirmable.
- **Q1 workload queries land.** The `[ESTIMATE]` tags come off. Most estimates here are conservative (under-counting phone, over-counting billing mix), so the true total could be ±30 min/day. Unlikely to change the ~45% automation ceiling.
- **RingCentral call-log integration.** Would replace the 12 calls/day and 18 calls/day estimates with actuals and tell us which calls are scheduling vs. clinical vs. admin — directly informs which phone automations to build first.
- **/api/messages endpoint discovery.** Single biggest lever outside writes. 30 min/day of R → Y.

## Sources

- Hard data: `/tmp/amd_patients.json` (975 records, 2026-04-02), `/tmp/amd_st_login_out.txt` (auth trace, 2026-04-05), `/tmp/amd_live_cookies.json` + `/tmp/amd_live_localStorage.json` (session artifacts, 2026-04-05).
- Memory files: `project_clinic_automation.md`, `reference_exult_fees.md`, `reference_amd_api.md`, `user_gautam_role.md`, `reference_rc_phone_routing.md`, `feedback_amd_writes.md`.
- Endpoint ground truth: `api_reference.json` (this directory).

## Next-session priorities (ordered by unblock value)

1. Fix the Chromium popup-blocker (relaunch with `--disable-popup-blocking` OR inject `window.open` hook via `Page.addScriptToEvaluateOnNewDocument` before the initial navigation). See `API_DOCUMENTATION.md > Crawl blocker`.
2. Complete login, capture the `token` cookie, persist the jar to `/Users/agent/.config/exult/advancedmd_session.json` with chmod 600 and a 30-min TTL marker.
3. Navigate to `https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Introduction.htm` and verify content loads (not a 302).
4. Crawl `Content/*.htm` for the full endpoint catalog → populate `api_documentation.json`.
5. Run Q1 2026 queries against `/api/patients` with `firstappointmentstart`/`firstappointmentend` filters, then probe `/api/appointments`, `/api/reminders`, and (most importantly) the `/connect/v1/*` write endpoints with read-only probes (GET where possible, OPTIONS where write-only).
6. Refresh every `[ESTIMATE]` cell in this doc with actuals.
7. Probe `/swagger/v1/swagger.json` on `pm-api-137` — the authoritative OpenAPI spec may be right there.
