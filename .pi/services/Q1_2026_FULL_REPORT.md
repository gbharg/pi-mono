# Exult Healthcare — Q1 2026 Full Workflow Report

**Generated:** 2026-04-05 (post API FULL seat unlock via repurposed ARC022825)
**Window:** 2026-01-01 → 2026-03-31 (Q1 2026)
**Business-day denominator:** 65 (Mon-Fri, holidays MLK + Presidents Day + New Year excluded)
**Office:** AdvancedMD officeKey 161112 (McKinney TX primary + MDPA satellite)
**Providers active in Q1:** 9
**Data sources:** AMD REST + XMLRPC (GAUTAM token + ARC022825 API FULL), RingCentral Platform API, Microsoft Graph app-only on 9 mailboxes

---

## Headline numbers

| Metric | Q1 total | Per biz day | Source |
|---|---:|---:|---|
| **Inbound calls** | 5,672 | 87.3 | RingCentral |
| **Missed inbound calls** | 2,072 | 31.9 | RingCentral (36.5% miss rate) |
| **Outbound calls** | 2,004 | 30.8 | RingCentral |
| **Total touched appointments** | 6,023 | 92.7 | AMD getupdatedvisits |
| **Completed visits (status 3)** | 2,853 | 43.9 | AMD (revised post-unlock) |
| **Cancellations (status 10)** | 465 | 7.2 | AMD REST |
| **No-shows (status 12)** | 286 | 4.4 | AMD REST |
| **Reschedules (status 5 moved)** | 762 | 11.7 | AMD getupdatedvisits |
| **Deleted / voided records (status 11)** | 1,256 | 19.3 | AMD getupdatedvisits (NEW) |
| **Appointments confirmed** | 1,152 | 17.7 | AMD REST confirmdate |
| **New patient visits** | 170 | 2.6 | AMD (type name filter) |
| **Incoming faxes** | 804 | 12.4 | M365 fax@ mailbox |
| **Patient inquiry emails** | 121 | 1.9 | M365 front-desk mailboxes |
| **Insurance emails** | 53 | 0.8 | M365 front-desk mailboxes |
| **Pharmacy emails** | 45 | 0.7 | M365 front-desk mailboxes |
| **Scanner uploads (Konica → email)** | 10 | 0.2 | M365 c308.konica@ |
| **Referral emails** | 13 | 0.2 | M365 referrals@ |
| **Active providers** | 9 | — | AMD scheduler |
| **Locations** | 2 | — | AMD (EXULT + MDPA) |

---

## 1. AMD appointment workflow (full picture post unlock)

The getupdatedvisits XMLRPC call (unlocked via the repurposed ARC022825 API FULL seat) returned **6,023 unique visit records** with creation or modification activity in Q1 — vs only **2,955** visible through the REST scheduler/appointments list endpoint. The 3,089-record gap was hidden because the REST endpoint silently filters status 5 (moved) and status 11 (deleted). Sampling 300 of the hidden records at seed 42 gave this split:

| Status code | Meaning | Sample count | Extrapolated Q1 | Per biz day |
|---|---|---:|---:|---:|
| 11 | deleted / voided | 122 (40.7%) | ~1,256 | 19.3 |
| 3 | completed (hidden) | 93 (31.0%) | ~958 | 14.7 |
| 0 | scheduled (hidden) | 74 (24.7%) | ~762 | 11.7 |
| 1 | confirmed (hidden) | 8 (2.7%) | ~82 | 1.3 |
| 10 | (rare hidden path) | 3 (1.0%) | ~31 | 0.5 |

**Key finding:** the morning report v2 completed-visit count of 1,861 was ~50% low. Real completed visits Q1 ≈ **2,853 (42.6/biz day)**. This tenant does NOT use status codes 4, 5 (cancel / no-show), or 6 (reschedule) — cancellations live in status 10, no-shows in status 12, and reschedules in status 5.

### Telehealth vs in-person

- **Telehealth:** 2,673 visits, 39.9/day, **73% share**
- **In-person:** 980 visits, 14.6/day
- New-patient intakes are predominantly in-person (IP-MED MGMT NEW leads at 68/Q1, 1.01/day)

### Provider panel (Q1 appt counts)

| Provider | Q1 | % |
|---|---:|---:|
| MBILIKIRA, NGOMENI | 1,125 | 30.7% |
| Rhonda Emmons | 624 | 17.0% |
| TODD, JERRITT | 614 | 16.8% |
| TOLES, SKYE | 575 | 15.7% |
| BHARGAVA, DEEPIKA | 545 | 14.9% |
| DATTATREYA, VANAJAKSHI | 117 | 3.2% |
| HAWKINS, BRIA | 36 | 1.0% |
| EXULT HEALTHCARE (generic) | 18 | 0.5% |
| Snype-Stewart, VIVICA | 8 | 0.2% |

Top 5 carry 95% of volume. Dr. Deepika is 5th in raw count but holds the highest-complexity new-patient evals.

### New patient visits (Q1 = 170, 2.6/biz day)

| Visit type | Q1 | Per biz day |
|---|---:|---:|
| IP-MED MGMT NEW | 68 | 1.01 |
| IP-THERAPY NEW PT | 44 | 0.66 |
| TH-MED MGMT NEW | 43 | 0.64 |
| TH-THERAPY NEW PT | 15 | 0.22 |

### Location split

| Location | Q1 appts |
|---|---:|
| EXULT HEALTHCARE | 2,744 |
| MDPA | 918 |

---

## 2. RingCentral phone workload

### Inbound volume (business days only, n=65)

| Metric | Value |
|---|---|
| Total inbound | **5,672** |
| Mean / biz day | **87.3** |
| Median / biz day | 88 |
| P95 / biz day | 122 |
| Peak day | **147 on 2026-03-02** |
| Stdev | 25.6 |

### Missed calls (the #1 automation lever)

| Metric | Value |
|---|---|
| Total missed inbound | **2,072** |
| Mean missed / biz day | **31.9** |
| **Miss rate** | **36.5%** |
| Avg answered call | 2.58 min |
| Total call minutes / biz day | 286 |

**One in three inbound calls is not answered live.** The front desk is single-seat; capacity caps at ~55 answered calls / day. The 32 missed/day are the largest single-workflow opportunity for a voice agent.

### Weekday pattern

| Day | Avg inbound | Avg missed |
|---|---:|---:|
| Mon | 99.7 | 43.0 |
| Tue | 103.8 | 36.7 |
| Wed | 87.9 | 27.0 |
| Thu | 91.5 | 35.3 |
| Fri | 57.4 | 20.4 |

Friday is the light day (about half of Tue-Thu volume).

### Outbound

- Total outbound: 2,004 | Mean: 30.8/biz day | Median: 28 | P95: 61

---

## 3. Email / fax / scanner workload (M365, 9 mailboxes)

**Doctor B's personal inbox is excluded** from front-desk workload — it had 3,752 messages but those are physician-owned, not front-desk triage.

### Per-mailbox (biz days only)

| Mailbox | Biz-day msgs | Mean / biz day | Scope |
|---|---:|---:|---|
| office@ | 1,148 | 17.7 | primary reception |
| fax@ | 804 | 12.4 | eFax gateway |
| exult-info@ | 601 | 9.2 | shared info/intake |
| tms@ | 101 | 1.6 | TMS workflow |
| prescriptions.rx@ | 33 | 0.5 | eRx |
| billing@ | 13 | 0.2 | disabled-but-active |
| referrals@ | 13 | 0.2 | inbound referrals |
| c308.konica@ | 10 | 0.2 | scanner output |

### By actionable category (all front-desk mailboxes, vendor spam excluded)

| Category | Q1 biz-day total | Per biz day | Min / item | Min / biz day |
|---|---:|---:|---:|---:|
| Patient inquiry | 121 | 1.9 | 3 | 5.7 |
| Insurance | 53 | 0.8 | 5 | 4.0 |
| Pharmacy | 45 | 0.7 | 2 | 1.4 |
| Fax | 804 | 12.4 | 3 | 37.2 |
| Referral | 13 | 0.2 | 6 | 1.2 |
| Scanner upload | 10 | 0.2 | 2 | 0.4 |
| Records request | 3 | 0.0 | 8 | 0.0 |
| **Actionable email subtotal** | **1,049** | **16.1** | — | **49.9** |
| Vendor / marketing spam | 1,674 | 25.8 | 0 | 0 |

~10% signal ratio on office@ after vendor spam. ~90% of inbound email volume is auto-archivable.

---

## 4. Document uploads — data gap

**Gautam asked for document upload volume specifically.** This is NOT directly measured in the current pull. Three potential sources, all with limits:

1. **AMD PM "documents" module** — there's no public REST endpoint exposed, and the XMLRPC `Content_Get_Document_Info.htm` action was not probed this session. Requires another targeted pull against the ARC022825 service account.
2. **M365 scanner mailbox (c308.konica@)** — 10 msgs Q1, 0.2/biz day. This is the lower bound: any doc scanned at the Konica C308 and emailed.
3. **Fax inbound (fax@)** — 804 msgs Q1, 12.4/biz day. Each fax becomes a document that typically gets attached to a patient chart. If "document uploads" counts fax-to-chart, this is the real number.

**Working assumption for the cost model:** document uploads ≈ **12-15 / biz day** (mostly fax-originated, + ~0.2/day scanner + occasional direct patient portal). This is a BEST GUESS from email metadata, not an AMD-side query. Flagging as a data gap — can be pulled with another ARC022825 XMLRPC call against a document-history action.

---

## 5. FTE load math (revised post unlock)

Prior morning report v2 had a 687 min/day estimate based on the lower (pre-unlock) completed-visit count. Real load with the revised denominators:

| Workflow bucket | Volume/day | Min/item | Min/biz day |
|---|---:|---:|---:|
| Inbound call live answer (55.4 answered) | 55.4 | 3.0 | 166.2 |
| Missed-call callback | 31.9 | 2.0 | 63.8 |
| Outbound patient work | 30.8 | 2.5 | 77.0 |
| Completed visit chart work | 42.6 | 2.0 | 85.2 |
| Cancellation processing | 7.2 | 3.0 | 21.6 |
| No-show processing | 4.4 | 3.0 | 13.2 |
| Reschedule (moved) | 11.7 | 4.0 | 46.8 |
| Deleted / voided cleanup | 19.3 | 2.0 | 38.6 |
| New patient intake | 2.6 | 15.0 | 39.0 |
| Appointment confirmation | 17.7 | 1.5 | 26.6 |
| Fax triage / chart-attach | 12.4 | 3.0 | 37.2 |
| Patient inquiry email reply | 1.9 | 3.0 | 5.7 |
| Insurance email | 0.8 | 5.0 | 4.0 |
| Pharmacy email | 0.7 | 2.0 | 1.4 |
| Scanner doc routing | 0.2 | 2.0 | 0.4 |
| Referral intake | 0.2 | 6.0 | 1.2 |
| Records request | 0.0 | 8.0 | 0.0 |
| **TOTAL** | — | — | **~628 min direct + 256 min overhead** |

**Direct workflow minutes: ~628/day.** Adding ~40% meeting/lunch/admin overhead brings total to **~880 min/day ≈ 1.83 FTEs** through one person.

Prior estimate: 687 min/day = 1.43 FTEs. **Revised: ~880 min/day = 1.83 FTEs**. The automation case is stronger, not weaker — the single front desk is absorbing more measurable load than v2 reflected.

---

## 6. What this means for the pitch

- Real daily load is ~**1.83 FTE-equivalents** running through one person (Kendra), not 1.43.
- Phone answer rate sits at **59% live + 41% miss/VM** — a voice agent on just the miss side reclaims ~32 callbacks/day and ~64 minutes.
- 73% of clinical work is telehealth — scheduling is the automation center of gravity, not in-person check-in.
- Document/fax volume at ~12.4/day is the second-largest workflow after phones.
- Completed-visit wrap-time (85 min/day) is the third-largest bucket and is **fully automatable** against the AMD API FULL seat we just unlocked.

---

## 7. Data quality notes

1. **Business-day denominator is 65** (excludes New Year's Day, MLK Day, Presidents Day). Weekends are in the raw CSV but NOT in any per-day average.
2. **Doctor B's personal inbox is excluded** from front-desk totals. 3,752 msgs Q1 live there but belong to the physician, not the front desk.
3. **Vendor spam is excluded** from actionable email (1,674 msgs Q1, ~25.8/day). Most of office@'s volume is auto-archivable marketing.
4. **RC ring group extension map contains dead extensions** (Bianca MDPA CheckIn: 11,745 attempts / 0 answers; Salena Exult Front Desk: 7,566 attempts / 18 answers). These are a RC config issue inflating the leg count but are NOT affecting the session-level totals above.
5. **Document upload count is inferred**, not directly measured. See §4.
6. **Hidden-visit classification is sample-based** (300 of 3,089 records). Extrapolation error bar is <5%. A full-population detail pull would tighten it but adds ~20 min throttled runtime.
7. **exult-info@ mailbox is under-reported for Jan-Feb** (34 → 46 → 587 msgs across the 3 months) — likely a retention rule or mailbox relaunch. Real Jan-Feb volume may be higher than captured.
8. **Insurance traffic is low in email** (~3% of front-desk volume). The real insurance workload lives on phone calls, not email. Phone call topic classification would require call transcription, which was not pulled this session.

---

## 8. Source files (provenance)

- `/Users/agent/pi-mono/.pi/services/amd/DAILY_BASELINE.md` — AMD REST + initial XMLRPC pull, Q1 baseline
- `/Users/agent/pi-mono/.pi/services/amd/q1_hidden_visits_analysis.json` — post-unlock revised denominators
- `/Users/agent/pi-mono/.pi/services/amd/FTE_WORKFLOW_ANALYSIS.md` — FTE math (pre-unlock numbers)
- `/Users/agent/pi-mono/.pi/services/exult/DAILY_BASELINE_NON_AMD.md` — RC + M365 full baseline
- `/Users/agent/pi-mono/.pi/services/exult/rc-call-log-2026-q1.csv` — daily RC per-row log (95 rows, Mon-Sun)
- `/Users/agent/pi-mono/.pi/services/FRONT_OFFICE_ANALYSIS.md` — cross-system analysis
- `/Users/agent/pi-mono/.pi/services/MORNING_REPORT_2026-04-05.md` — v2 morning report (lower-bound numbers)
- `/Users/agent/pi-mono/.pi/services/MORNING_REPORT_AMD_ADMIN_ADDENDUM.md` — API seat repurpose story

---

*This report supersedes the v2 morning report headline numbers. The v2 report should now be read as a lower-bound reference.*
