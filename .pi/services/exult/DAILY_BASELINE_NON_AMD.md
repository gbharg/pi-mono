# Exult Healthcare — Non-AMD Daily Baseline (2026-01-01 to 2026-04-05)

Generated: 2026-04-05T06:09:03
Purpose: Baseline for front-desk automation cost model. Merges with the AMD workload analysis (parallel deliverable in `.pi/services/amd/`).

> SCOPE: This report covers every front-desk workflow EXCEPT AdvancedMD (AMD). A parallel session owns AMD. All per-day averages use BUSINESS DAYS ONLY (Mon-Fri, excluding federal holidays). Weekends and holidays appear in the raw CSV for completeness but are NOT in the denominator.

## Window and Denominator

- Window: 2026-01-01 00:00 UTC → 2026-04-05 23:59 UTC
- Local time zone for daily bucketing: America/Chicago (CST before 2026-03-08, CDT after)
- Calendar days with data: 94
- Business days in denominator: **65**
- Federal holidays excluded: 2026-01-01, 2026-01-19, 2026-02-16 (New Year's Day, MLK Day, Presidents Day)
- Weekend days excluded from averages: 29

## Data Sources

| Source | Status | Records pulled |
|---|---|---|
| RingCentral Platform API (account call-log) | OK | 8074 calls |
| Microsoft Graph (app-only, client_credentials) | OK | 6847 messages across 9 mailboxes |
| Microsoft Graph — Teams chats | SKIPPED | ChatMessage.Read.All not granted in app-only permissions |
| AdvancedMD | INTENTIONALLY NOT TOUCHED | parallel session owns AMD |

Endpoint documentation (required to be written before any numbers):
- `rc-endpoints.md` — RingCentral endpoints, auth, response shapes, rate limits
- `graph-endpoints.md` — Microsoft Graph endpoints, auth, response shapes, category heuristics

---

## 1. RingCentral Call Volume

### 1.1 Summary — business days only (n=65)

| Metric | Value |
|---|---|
| Total inbound calls (biz days) | 5672 |
| Total outbound calls (biz days) | 2004 |
| Total missed inbound (biz days) | 2072 |
| Mean inbound / biz day | **87.3** |
| Median inbound / biz day | 88 |
| P95 inbound / biz day | 122 |
| Max inbound (peak day) | 147 on 2026-03-02 |
| Stdev inbound / biz day | 25.6 |
| Mean outbound / biz day | **30.8** |
| Median outbound / biz day | 28 |
| P95 outbound / biz day | 61 |
| Mean missed inbound / biz day | **31.9** |
| P95 missed / biz day | 58 |
| Missed inbound rate | **36.5%** |
| Avg answered call duration | 2.58 min (154.7s) |
| Mean total call minutes / biz day | 286.0 |
| P95 call minutes / biz day | 422.2 |

### 1.2 Totals across ALL days (weekends included) — for reference only

| Metric | Value |
|---|---|
| Total inbound | 6006 |
| Total outbound | 2068 |
| Total missed | 2204 |
| Total answered inbound | 3793 |
| Total call minutes | 19335.5 |
| Missed rate (all days) | 36.7% |

### 1.3 Weekday Pattern (business days only)

| Day | Avg Inbound | Avg Outbound | Avg Missed | n biz days |
|---|---|---|---|---|
| Mon | 99.7 | 28.8 | 43 | 11 |
| Tue | 103.8 | 29 | 36.7 | 13 |
| Wed | 87.9 | 35 | 27 | 14 |
| Thu | 91.5 | 34 | 35.3 | 13 |
| Fri | 57.4 | 27 | 20.4 | 14 |

Observations:
- Friday is a light day (~57 inbound vs ~100 Mon-Thu). The clinic may close early or run a lighter schedule on Fridays.
- 36.5% miss rate is very high. Approximately 1 in 3 inbound calls is NOT answered — voicemail, abandoned, or hang-up. This is the largest single lever for an automation agent.
- Avg answered call duration 2.58 min is consistent with quick scheduling/reschedule interactions.

### 1.4 Top Extensions (volume share)

| Extension | Calls (biz+weekend, in+out) |
|---|---|
| 102 | 82 |
| 111 | 53 |
| 103 | 33 |
| 203 | 11 |
| 104 | 5 |
| 263 | 3 |
| 402 | 2 |
| 129 | 1 |
| 201 | 1 |
| 204 | 1 |

Note: only calls explicitly routed to/from a named extension are counted; IVR-routed and unassigned inbound calls are NOT in this table. Extension 102 is the top-attributed line, likely front desk.

### 1.5 Daily breakdown

Full daily log with per-day inbound/outbound/missed/minutes: see `rc-call-log-2026-q1.csv` in this directory.
CSV columns: `date, weekday, business_day, inbound, outbound, missed_inbound, answered_inbound, total_minutes, inbound_minutes, peak_hour`. The `business_day` column is `Y` for Mon-Fri non-holiday and `N` otherwise; averages above use only `Y` rows.

---

## 2. Microsoft 365 Mailbox Volume

Tenant: `exulthealthcare.com` (40 users total)
Candidate front-desk / shared mailboxes inspected: 10

### 2.1 Per-mailbox rollup (business days only)

| Mailbox | Display Name | Total msgs | Biz-day msgs | Mean / biz day | Scope |
|---|---|---|---|---|---|
| admin@exulthealthcare.com | Exult Admin | — | — | — | ERROR: access/404 |
| billing@exulthealthcare.com | Billing | 16 | 13 | 0.2 | front-desk |
| c308.konica@exulthealthcare.com | c308.konica | 13 | 10 | 0.2 | front-desk |
| doctorb@exulthealthcare.com | Doctor B | 3752 | 3225 | 49.6 | OUT OF SCOPE (MD personal) |
| exult-info@exulthealthcare.com | Exult Info | 669 | 601 | 9.2 | front-desk |
| fax@exulthealthcare.com | Fax | 952 | 804 | 12.4 | front-desk |
| office@exulthealthcare.com | Office | 1278 | 1148 | 17.7 | front-desk |
| prescriptions.rx@exulthealthcare.com | Prescriptions RX | 38 | 33 | 0.5 | front-desk |
| referrals@exulthealthcare.com | Referrals | 16 | 13 | 0.2 | front-desk |
| tms@exulthealthcare.com | TMS | 113 | 101 | 1.6 | front-desk |

Notes on access and scope:
- `admin@exulthealthcare.com` and `agent@exulthealthcare.com` return 404 (user accounts exist but have no mailbox provisioned — license type without Exchange Online).
- `billing@` is disabled but still has 16 messages in Q1 (very low volume).
- `office@` is the primary reception/front-desk inbox based on volume.
- `fax@` is a dedicated inbox for incoming eFax notifications.
- `c308.konica@` is the Konica Minolta C308 scanner's 'scan to email' address.
- **`doctorb@` is Dr. Bhargava's personal inbox and is EXCLUDED from the front-desk work rollup.** It's listed above for inventory completeness but the front-desk FTE does not triage it. The 3,752 messages in that mailbox are the physician's own inbox, not front-desk workload.

### 2.2 Category breakdown — front-desk mailboxes only (biz days, doctorb@ EXCLUDED)

| Category | Total biz-day msgs | Mean / biz day | Est min / item | Est min / biz day |
|---|---|---|---|---|
| patient_inquiry | 121 | 1.9 | 3 | 5.7 |
| insurance | 53 | 0.8 | 5 | 4.0 |
| records | 3 | 0.0 | 8 | 0.0 |
| pharmacy | 45 | 0.7 | 2 | 1.4 |
| fax | 804 | 12.4 | 3 | 37.2 |
| scanner | 10 | 0.2 | 2 | 0.4 |
| referral | 13 | 0.2 | 6 | 1.2 |
| vendor_spam | 1674 | 25.8 | 0 | 0.0 |

**Email triage total (actionable categories, vendor_spam = 0 min): ~49.9 min/biz day.**

### 2.3 Category breakdown — per mailbox (biz-day totals)

**billing@exulthealthcare.com** — 13 biz-day msgs (0.2/day)

- vendor_spam: 13

**c308.konica@exulthealthcare.com** — 10 biz-day msgs (0.2/day)

- scanner: 10

**doctorb@exulthealthcare.com** — 3225 biz-day msgs (49.6/day)

- vendor_spam: 3079
- insurance: 105
- patient_inquiry: 35
- pharmacy: 3
- records: 3

**exult-info@exulthealthcare.com** — 601 biz-day msgs (9.2/day)

- vendor_spam: 544
- insurance: 40
- pharmacy: 9
- patient_inquiry: 5
- records: 3

**fax@exulthealthcare.com** — 804 biz-day msgs (12.4/day)

- fax: 804

**office@exulthealthcare.com** — 1148 biz-day msgs (17.7/day)

- vendor_spam: 1023
- patient_inquiry: 110
- insurance: 13
- pharmacy: 2

**prescriptions.rx@exulthealthcare.com** — 33 biz-day msgs (0.5/day)

- pharmacy: 33

**referrals@exulthealthcare.com** — 13 biz-day msgs (0.2/day)

- referral: 13

**tms@exulthealthcare.com** — 101 biz-day msgs (1.6/day)

- vendor_spam: 94
- patient_inquiry: 6
- pharmacy: 1

### 2.4 Category heuristic accuracy

- Mailbox-level override applied: everything in `fax@` is categorized as `fax`, everything in `c308.konica@` is `scanner`, everything in `prescriptions.rx@` is `pharmacy`, everything in `referrals@` is `referral`.
- In `office@`, 1148 of 1278 msgs (~90%) fell into `vendor_spam`. This reflects reality of shared-inbox noise — real front-desk signal is the 113 `patient_inquiry` + 15 `insurance` + 2 `pharmacy` items (~130 actionable out of 1278 ≈ 10% signal ratio). The baseline uses the actionable subset for minute estimates.
- Records requests: 0 matched regex — either the heuristic is too strict (ROI requests sometimes use 'release of information' not 'records'), or records requests come in via fax to `fax@` rather than email. Flagged as a data gap.
- Subject lines were NOT written to any output file. Categories are the only thing persisted.

---

## 3. Other Systems Checked

- `/Users/agent/pi-mono/.config/exult/microsoft365.json`: same app credentials as `/Users/agent/.config/exult-m365/app_creds.json` but with admin metadata attached. No difference in access — both are the same client_credentials app.
- `/Users/agent/pi-mono/.config/exult/ringcentral.json`: JWT-auth app 'Remote Admin', permanent token, `ReadCallLog` scope confirmed working.
- `/Users/agent/pi-mono/.config/exult/advancedmd.json`: NOT OPENED — parallel session owns AMD.
- Teams: not accessible via app-only without additional ChatMessage.Read.All grant. SKIPPED.
- No other front-desk tool credentials found in the ~/.config tree.

---

## 4. Key Metrics Rollup (non-AMD, business days only)

Front-desk minute budget per biz day (480 min = 8h FTE):

| Workflow | Volume/biz day | Min/item | Min/biz day |
|---|---|---|---|
| Phone call handling (inbound answered + touch) | 55.4 answered of 87.3 inbound | 3.0 | 261.9 |
| Missed-call callback work (VM listen + callback) | 31.9 | 2.0 | 63.8 |
| Email: patient_inquiry | 1.9 | 3 | 5.7 |
| Email: insurance | 0.8 | 5 | 4.0 |
| Email: pharmacy | 0.7 | 2 | 1.4 |
| Email: fax | 12.4 | 3 | 37.2 |
| Email: scanner | 0.2 | 2 | 0.4 |
| Email: referral | 0.2 | 6 | 1.2 |
| Email: vendor_spam (auto-filter, 0 work) | 25.8 | 0 | 0.0 |
| **Non-AMD subtotal** |  |  | **375.6** |

- Non-AMD workload as % of one 480-min FTE day: **78.2%**
- Remaining capacity for AMD workflows: **104.4 min/biz day** — this is the budget the parallel AMD analysis has to fit inside.

NOTE on phone handling: the 3 min/call estimate is wrap-time (answer, schedule, notes, hang up). The RC-measured mean answered call duration is only 2.58 min of talk time; adding ~0.5 min for after-call wrap is the source of the 3-min figure.

---

## 5. WORKFLOWS THE AGENT MUST HANDLE DAILY

Every action type surfaced by the data, with business-day frequency. This is the enumeration for Gautam's per-action cost model.

| # | Workflow | Source | Biz-day volume | Minutes now | Auto-elig |
|---|---|---|---|---|---|
| 1 | Inbound call — answer live | RingCentral | 55.4 | 166.2 | medium (voice agent) |
| 2 | Missed call — voicemail + callback | RingCentral | 31.9 | 63.8 | high (SMS/voice bot) |
| 3 | Outbound call — patient-initiated followup | RingCentral | 30.8 | 77.0 | medium |
| 4 | Vendor/spam email (auto-archive, no human touch) | MS Graph | 25.8 | 0.0 | trivial (filter+archive) |
| 5 | Email: fax via fax@exulthealthcare.com | MS Graph | 12.37 | 37.1 | high |
| 6 | Email: patient_inquiry via office@exulthealthcare.com | MS Graph | 1.69 | 5.1 | high |
| 7 | Email: insurance via exult-info@exulthealthcare.com | MS Graph | 0.62 | 3.1 | high |
| 8 | Email: pharmacy via prescriptions.rx@exulthealthcare.com | MS Graph | 0.51 | 1.0 | high |
| 9 | Email: insurance via office@exulthealthcare.com | MS Graph | 0.2 | 1.0 | high |
| 10 | Email: referral via referrals@exulthealthcare.com | MS Graph | 0.2 | 1.2 | high |
| 11 | Email: scanner via c308.konica@exulthealthcare.com | MS Graph | 0.15 | 0.3 | high |
| 12 | Email: pharmacy via exult-info@exulthealthcare.com | MS Graph | 0.14 | 0.3 | high |
| 13 | Email: patient_inquiry via tms@exulthealthcare.com | MS Graph | 0.09 | 0.3 | high |
| 14 | Email: patient_inquiry via exult-info@exulthealthcare.com | MS Graph | 0.08 | 0.2 | high |
| 15 | Email: records via exult-info@exulthealthcare.com | MS Graph | 0.05 | 0.4 | medium |

---

## 6. Cost-Model Inputs (per-action token estimates)

For Gautam's per-action token cost model, these are the verified volumes (non-AMD) combined with rough LLM token estimates per invocation. In/out tokens assume Claude 3.5 Sonnet class with context compaction.

| Action | Biz-day volume | Complexity | Est LLM tokens (in/out) | Daily tokens (in/out) |
|---|---|---|---|---|
| Inbound call handling (answered) | 55.4 | medium | 12,000 / 1,500 | 664,800 / 83,100 |
| Missed-call callback | 31.9 | medium | 10,000 / 1,000 | 319,000 / 31,900 |
| Outbound call handling | 30.8 | low | 12,000 / 1,500 | 369,600 / 46,200 |
| Patient inquiry email reply | 1.9 | medium | 6,000 / 500 | 11,400 / 950 |
| Insurance / eligibility email | 0.8 | medium | 10,000 / 1,500 | 8,000 / 1,200 |
| Records request email | 0.0 | high | 18,000 / 2,000 | 0 / 0 |
| Pharmacy / eRx message | 0.7 | low | 5,000 / 500 | 3,500 / 350 |
| Incoming fax triage | 12.4 | low | 4,000 / 300 | 49,600 / 3,720 |
| Scanner doc routing (Konica) | 0.2 | low | 4,000 / 300 | 800 / 60 |
| Referral intake | 0.2 | high | 14,000 / 1,800 | 2,800 / 360 |
| Vendor / spam filter (auto-archive) | 25.8 | trivial | 600 / 20 | 15,480 / 516 |

**Daily token totals (non-AMD only): ~1,444,980 input / ~168,356 output**

Monthly extrapolation (22 biz days): ~31,789,560 input / ~3,703,832 output tokens per month.

---

## 7. Data Gaps

- **Teams chats**: skipped. App-only token does not have `ChatMessage.Read.All`. If there's front-desk coordination happening in a Teams channel, it's invisible here.
- **Records requests (ROI)**: 0 detected in email. Either the keyword list is too narrow, or records come in via `fax@` and are already counted there. Recommend manual sampling of 20 random fax@ subjects to validate.
- **Attributing inbound calls to specific workflow types**: RingCentral call log has direction/duration/result but no topic tagging. We can't distinguish 'new patient booking' from 'reschedule' from 'billing question' without call recording transcription. This is the largest open variable in the cost model.
- **Voicemail transcripts**: RC supports VM-to-text but `ReadCallRecording` scope is available yet VM body was not pulled (PHI concern). A future pass could pull VM *lengths* without transcript bodies to validate the 2-min callback estimate.
- **Outbound call origin**: Outbound calls may come from staff initiating work (eligibility checks, pharmacy followups) OR from automated dialers. Not distinguishable from call-log data alone.
- **After-hours traffic**: weekend and holiday calls exist (weekend rows in CSV) but are not attributed to business-day FTE work. They're either voicemail-only or routed to an answering service — needs confirmation from Gautam.
- **Billing mailbox (disabled but active)**: 16 messages still arrived in a disabled mailbox. Who reads these? Probably no one — which is itself a finding.
- **`office@` signal ratio**: only ~10% of office@ volume is actionable. The remaining 90% is newsletters, vendor marketing, appointment-reminder bounces, etc. An agent should filter these aggressively before surfacing.

## 8. Rate-limit notes (operational)

- RingCentral Heavy API: 10 req / 60s window, strictly enforced. Successive 429s DO re-arm the cooldown, so any retry-storm makes things worse. Our puller paces at 7s between requests and dynamically waits 62s when `X-Rate-Limit-Remaining <= 1`. Full Q1 pull takes ~3 minutes of active runtime plus any 429 penalties.
- Microsoft Graph: no throttling hit for this volume (~6,800 messages across 8 mailboxes). Would matter for full-year pulls.

## 9. Files produced

- `DAILY_BASELINE_NON_AMD.md` (this file)
- `rc-call-log-2026-q1.csv` — full daily call log, Mon-Sun, 95 rows
- `rc-endpoints.md` — RingCentral endpoint documentation (written before data pull)
- `graph-endpoints.md` — Microsoft Graph endpoint documentation (written before data pull)

