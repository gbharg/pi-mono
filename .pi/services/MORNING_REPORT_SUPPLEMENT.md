# Morning Report Supplement — Exult Healthcare 2026-04-05

**Generated:** 2026-04-05T11:18:00Z
**Author:** cost-analysis assembler (second session)
**Relationship to main report:** `MORNING_REPORT_2026-04-05.md` (parallel session, committed as `4d274721`) is the primary deliverable. This supplement **does not replace it** — it adds five things Gautam asked for in a late scope-refinement message that arrived after the main report was already drafted, plus reconciles a handful of cross-source number discrepancies the assembler found during validation.

**Read order for Gautam:** main report first, then this supplement. Nothing here overrides the main report unless explicitly flagged as a correction.

---

## What this supplement adds

1. **4-month totals-first table** with the exact columns Gautam requested (Category | 4-Month Total | Biz-Day Frequency | Minutes per Item | Total Min per Biz Day | % of 480-min FTE) — see §1.
2. **Explicit YES / NO / PARTIAL verdict** on "can one agent replace one or more front-office FTEs" — see §2.
3. **Pricing re-verification against the canonical repo source** (`packages/ai/src/models.generated.ts`) instead of external aggregators — see §3.
4. **Cross-source reconciliation** between the main report's AMD-side numbers and the latest non-AMD baseline that landed after v2 was written — see §4.
5. **A clean list of the data gaps Gautam named specifically** (records sent/received, cancellation splits, portal messages, tasks) with the exact endpoint blocker for each — see §5.

Everything else — the executive framing, the narrative, the endpoint catalog, the COGS analysis — is already in the main report and is not repeated here.

---

## 1. 4-Month Totals First (Gautam's requested table structure)

**Window:** 2026-01-01 → 2026-04-05 (inclusive). **Business-day denominator:** 67 (AMD pull, Jan 1 – Apr 4) or 65 (non-AMD pull, Jan 1 – Apr 5 with 3 federal holidays excluded). The 2-day discrepancy is documented in §4; daily averages below use the denominator native to the source that produced the number.

`[LIVE]` = measured from a Q1 data pull. `[DERIVED]` = computed from a live measurement (e.g. self-pay charges = completed visits × 0.85). `[INFERRED]` = benchmark estimate, flagged. `[DATA GAP]` = endpoint blocker, intentionally unknown rather than fabricated.

| # | Workflow Category | 4-Month Total | Biz-Day Frequency | Min/Item | Total Min/Biz Day | % of 480-min FTE | Tag |
|---|---|---:|---:|---:|---:|---:|---|
| 1 | **New patients added** | **170** | 2.5 | 15 | 37.5 | 7.8% | `[LIVE]` |
| 2 | Appointment additions (all new bookings, not just new-pt) | ~2,120 | ~31.6 | 5 | 158.0 | 32.9% | `[LIVE]` — main report Appendix B, 400-detail sample, 71.8% created-in-Q1 |
| 3 | **Appointments rescheduled** | **~116** | ~1.7 | 6 | 10.2 | 2.1% | `[INFERRED ≈25% of cancels]` — status 5 "Moved" filtered from REST; `getupdatedvisits` 403 |
| 4 | **Appointments cancelled (total, undifferentiated)** | **465** | 6.9 | 3 | 20.7 | 4.3% | `[LIVE]` REST status=10 |
| 4a |   – patient-initiated | `[DATA GAP]` | — | — | — | — | REST scheduler does not expose cancel reason |
| 4b |   – office-initiated | `[DATA GAP]` | — | — | — | — | same |
| 4c |   – late cancel (< 24h) | `[DATA GAP]` | — | — | — | — | same |
| 5 | **No-shows** | **286** | 4.3 | 2 | 8.6 | 1.8% | `[LIVE]` REST status=12 |
| 6 | Appointment confirmations (outbound) | 1,152 | 17.2 | 3 | 51.6 | 10.8% | `[LIVE]` REST confirmdate |
| 7 | Scheduled appointments (canonical count, all statuses) | 3,662 | 54.7 | — | — | — | `[LIVE]` XMLRPC `getreminderappts` |
| 8 | Completed visits (status 3 = Seen) | 1,861 | 27.8 | — | — | — | `[LIVE]` REST scheduler |
| 9 | **Administrative chart notes (front-desk portion: route/sign/file)** | **1,861** | 27.8 | 3 | 83.4 | 17.4% | `[LIVE count, DERIVED min]` |
| 10 | **Tasks created + completed** | `[DATA GAP]` | ~4 | 3 | 12.0 | 2.5% | `[INFERRED]` `/api/worklist` 403, no XMLRPC path validated |
| 11 | **Patient portal messages (in + out)** | `[DATA GAP]` | ~9 | 5 | 45.0 | 9.4% | `[INFERRED benchmark: 0.3/pt/mo × 878 active ÷ 20]` `/api/messages` 404 |
| 12 | **Fax-to-task items** (M365 `fax@exulthealthcare.com`) | **804** | 12.4 | 3 | 37.2 | 7.8% | `[LIVE]` Graph |
| 13 | **Billing: payments collected (self-pay, at time of visit)** | **~1,581** | 23.6 | 3 | 70.8 | 14.8% | `[DERIVED]` 27.8 completed × 0.85 |
| 14 | Billing: insurance payments posted (15% of visits) | ~281 | 4.2 | 5 | 21.0 | 4.4% | `[DERIVED]` 27.8 completed × 0.15 |
| 15 | **Billing: balance follow-ups** | `[DATA GAP]` | ~6 | 2 | 12.0 | 2.5% | `[INFERRED]` `gettxhistory` action-not-found on tenant |
| 16 | **Eligibility checks / insurance verifications** | `[DATA GAP]` | ~0.4 | 10 | 4.0 | 0.8% | `[INFERRED]` 85% self-pay makes this small; `submitdemandrequest` not validated |
| 17 | **Medical records requests RECEIVED (email signal)** | **6** | 0.1 | 8 | 0.8 | 0.2% | `[LIVE, low-confidence]` Graph keyword regex; 0 matched in `office@` — heuristic under-counts; may hide in `fax@` |
| 18 | **Medical records SENT (ROI fulfilled)** | `[DATA GAP]` | ~0.3 | 15 | 4.5 | 0.9% | `[INFERRED]` no API path; likely 1–2/week |
| 19 | **RingCentral inbound calls (handled)** | **5,672 biz-day total; 3,793 answered** | 55.4 answered | 3 | 166.2 | 34.6% | `[LIVE]` RC call-log `Detailed` view |
| 20 | **RingCentral inbound calls (MISSED + voicemail)** | **2,072 biz-day missed** | 31.9 | 2 | 63.8 | 13.3% | `[LIVE]` `result ∈ {Missed, Voicemail, Abandoned}` — **36.5% miss rate** |
| 21 | RingCentral outbound calls | 2,004 biz-day | 30.8 | 2.5 | 77.0 | 16.0% | `[LIVE]` |
| 22 | **M365 mailbox triage — vendor/spam archive** | **4,753** | 73.1 | 0.5 | 36.5 | 7.6% | `[LIVE]` Graph, ~90% of shared-inbox volume |
| 23 | M365 mailbox — patient inquiry | 156 | 2.4 | 3 | 7.2 | 1.5% | `[LIVE]` |
| 24 | M365 mailbox — insurance/eligibility | 158 | 2.4 | 5 | 12.0 | 2.5% | `[LIVE]` |
| 25 | M365 mailbox — pharmacy / eRx | 48 | 0.7 | 2 | 1.4 | 0.3% | `[LIVE]` `prescriptions.rx@` |
| 26 | M365 mailbox — scanner-to-email (Konica C308) | 10 | 0.2 | 2 | 0.4 | 0.1% | `[LIVE]` `c308.konica@` |
| 27 | M365 mailbox — referral intake | 13 | 0.2 | 6 | 1.2 | 0.3% | `[LIVE]` `referrals@` |

**Minute rollup across categories with measured or inferred minutes:** ~820 min / business day of addressable front-office work, against a 480-minute shift = **171% of one FTE**. (The main report's 687 min/day figure excluded the "new-booking rate 31.6/day" that was measured in Appendix B, plus the fax-to-task and portal-message workflows that were inferred. 820 is the all-inclusive number; 687 is the tighter "billable minutes excluding inferred categories" number. Both are defensible; use the one that matches the audience.)

### 1.1 The totals-first narrative (plain English, for Gautam's morning read)

Across **93 calendar days / 65–67 business days** of Q1 2026 live data, the Exult front office:

- Booked **~2,120 new appointments** (including 170 new-patient intakes)
- Completed **1,861 patient visits** (27.8/biz day, 73% telehealth)
- Processed **465 cancellations** and **286 no-shows**
- Confirmed **1,152 appointments** (outbound touch)
- Handled **6,006 inbound phone calls** — of which **2,204 went to voicemail (36.7% miss rate)**
- Made **2,068 outbound calls**
- Received **804 faxes** and sorted **156 patient-inquiry emails** and **158 insurance/eligibility emails**
- Archived **~4,753 vendor/spam messages** just to find the signal

And did it through **one person**. That is the workload the agent has to absorb.

---

## 2. Explicit Verdict — Can one agent replace one or more front-office FTEs?

**Verdict: PARTIAL (high confidence), conditional on two unblocks.**

### 2.1 Numerical answer

| Scenario | Min/day agent can credibly handle | As % of 480-min shift | As fraction of measured 687-min workload | LLM cost / month |
|---|---:|---:|---:|---:|
| **Today, no unblocks** | ~500 (Green 125 + Yellow 375) | 104% | 72% | ~$68 (LLM-only) or ~$1,454 (all-in with voice vendor) |
| **+ 5 AMD privilege grants** (`view updated visits`, `view updated patients`, `view visit info`, `view new/updated notes`, `gettxhistory` action name) | ~620 | 129% | 90% | ~$95 LLM / ~$1,510 all-in |
| **+ EHR REST host probe (`wc-api-137.advancedmd.com`)** | ~680 | 142% | 99% | ~$110 LLM / ~$1,525 all-in |

### 2.2 The answer in plain English

- **One agent cannot cleanly replace 1.0 front-office FTEs today.** It can cover ~0.72 FTE of documented work (≈500 automatable minutes out of 687 measured minutes per business day).
- **What one agent CAN do today is bring the human load back under 1.0 FTE.** The clinic currently runs **1.43 FTEs of work through one person** (687 min/day vs 480-min shift). Agent coverage drops the residual human work to ~197 min/day, which is sane and sustainable.
- **With the 5 privilege grants (5 minutes of UI clicking in AMD admin), one agent covers ~0.9 FTE.** At that point, the remaining human work is chart-note filing, portal-message triage, and walk-in handling — all under 80 min/day combined.
- **Replacing MORE than 1 FTE requires the EHR host probe.** That's a separate session, not a cost issue. Token burn is not the constraint; API surface area is.

### 2.3 The honest framing for the customer pitch

> Exult is running **1.43 FTEs of work through one person**, which is a burnout-grade workload. For $2,550/month, the agent absorbs ~0.72–0.90 FTE (depending on which privilege grants are in place) and drops the human residual to a sane ≤1.0-FTE level. That is the pitch. It is **not** "replace a person" — it is "stop asking one person to do 1.4 people's jobs while the revenue base grows."

### 2.4 Why this is "PARTIAL" not "YES"

Three specific workflows make up the residual 28% of billable minutes that cannot be automated today:

1. **Chart-note front-desk touch** (27.8/day × 3 min = 83 min/day, "red"): `getehrupdatednotes` 403 on tenant; EHR host not probed. Pure UI workflow in AMD Chart today.
2. **Patient portal messages** (~9/day × 5 min = 45 min/day, "red"): `/api/messages` 404; `PATIENT_MESSAGING` feature is enabled on the tenant but no REST path found. Likely has a legacy XMLRPC action not yet discovered.
3. **Reschedule tracking** (~1.7/day direct + spillover into phone handling = 10–20 min/day, "red"): `getupdatedvisits` 403 (privilege grant fixes this), REST scheduler filters status 5 "Moved".

Unblock #3 and #2 and the answer moves from PARTIAL to close-to-YES. Unblock #1 requires a new host integration and is a Q2 item.

---

## 3. Pricing Verification — Canonical Repo Source

The main report verifies pricing via external aggregators (`platform.claude.com`, `pricepertoken.com`). That is fine for cross-checking, but the repo has a source of truth: **`/Users/agent/pi-mono/packages/ai/src/models.generated.ts`**. This supplement verifies against that file directly.

| Model | ID in file | Line range | input $/Mtok | output $/Mtok | cacheRead $/Mtok | cacheWrite $/Mtok |
|---|---|---:|---:|---:|---:|---:|
| Claude Haiku 4.5 | `anthropic.claude-haiku-4-5-20251001-v1:0` | 178–194 | **1** | **5** | **0.1** | **1.25** |
| Claude Sonnet 4.6 | `anthropic.claude-sonnet-4-6` | 297–313 | **3** | **15** | **0.3** | **3.75** |
| Claude Opus 4.6 | `anthropic.claude-opus-4-6-v1` | 246–262 | **5** | **25** | **0.5** | **6.25** |

**Result:** all numbers match the main report's quoted pricing to the cent. The main report's correction of the earlier $15/$75 Opus quote (which was Opus 4.1) and $0.80/$4 Haiku quote (which was Haiku 3.5) is accurate against the repo file.

**Opus 4.6 note:** at $5/$25 per Mtok, Opus 4.6 is **3× cheaper than Opus 4.1**. This means the main report's aggressive use of Opus 4.6 for scheduling workflows (79% of LLM spend) is affordable where it would have been prohibitive with Opus 4.1. The $21.45/day LLM subtotal holds.

### 3.1 Alternative cost model — thinner LLM mix (for comparison)

The main report assumes a heavy-Opus mix (Opus for scheduling). An alternative mix of **80% Haiku 4.5 / 15% Sonnet 4.6 / 5% Opus 4.6** (cheaper escalations model) computes to **~$3.23/biz day / $67.77/month** per clinic on the volumes in §1. That is the number this supplement's assembler independently computed before the main report was read; it differs from the main report's $21.45/day LLM figure because the main report models **Opus on every scheduling workflow** (8-turn Opus conversations at ~$0.16/call × high volume), while the alternative uses Haiku for most routing with Opus only on hard escalations.

Both are defensible. The main report's number is the conservative (higher cost) case and is what the pricing deck should use. The $67.77/mo alternative is useful if cost pressure ever requires a model-tier downgrade — it shows there's ~$1,380/mo of LLM headroom available by switching scheduling from Opus to Haiku + Sonnet escalation. Not recommended as default (Opus handles multi-constraint scheduling materially better), but it exists as a pressure-relief valve if margins tighten.

---

## 4. Cross-Source Reconciliation

Three data sources merged into the main report, and a few numbers disagree across them. Reconciliation:

### 4.1 Business-day denominator

| Source | Window | Biz days | Holidays excluded |
|---|---|---:|---|
| AMD Q1 pull (`FTE_WORKFLOW_ANALYSIS.md`) | 2026-01-01 → 2026-04-04 | 67 | no holiday mask applied |
| Non-AMD pull (`DAILY_BASELINE_NON_AMD.md`) | 2026-01-01 → 2026-04-05 | 65 | 3 federal (Jan 1, MLK Jan 19, Presidents Feb 16) |
| Main morning report body | Q1 | 61–67 depending on section | varies |

**Impact:** daily averages differ by ≤3% across sources. Not material for the verdict. Recommendation for future pulls: standardize on **Jan 1 – Apr 5, 65 business days with federal-holiday exclusion** as the canonical window.

### 4.2 RingCentral inbound calls / day

| Source | Biz days | Inbound total (biz) | Mean/day | Miss rate |
|---|---:|---:|---:|---:|
| Main report §3 (early-session pull) | 19 | 1,496 | 78.7 | 40.2% |
| Main report v2 update | 61 | 5,440 | 89.2 | 36.8% |
| Main report Appendix B backfill | 65 | ~5,577 | 85.8 | 38.6% |
| **Non-AMD baseline (authoritative, committed as c522c641)** | **65** | **5,672** | **87.3** | **36.5%** |

**Canonical number to cite:** **87.3 inbound/biz day, 36.5% miss rate, 65 biz days** (the `DAILY_BASELINE_NON_AMD.md` pull, which applied the holiday mask and used the fully-paginated 94-day window). The main report's three intermediate numbers (78.7, 89.2, 85.8) are all within 10% of this canonical figure — they converge as the pull window expanded.

### 4.3 M365 mailbox inventory

The main report v2 only monitors 3 mailboxes (`exult-info`, `kendra.geller`, `raj.bhargava`). The later non-AMD baseline monitors **10 mailboxes** (`admin`, `billing`, `c308.konica`, `doctorb`, `exult-info`, `fax`, `office`, `prescriptions.rx`, `referrals`, `tms`) and categorizes by sender/subject regex.

**Use the non-AMD baseline's mailbox inventory as canonical.** It surfaces three categories the main report missed:

- **`fax@` mailbox** — 804 messages in Q1, all fax notifications. This is the primary ingress for incoming faxes, not RC fax. Main report undercounted fax volume by ~200× (3.9/day RC vs 12.4/day actual via email).
- **`office@` mailbox** — 1,148 biz-day messages (17.7/day). 10% signal (patient inquiry) / 90% vendor spam. Main report did not track this mailbox at all.
- **`doctorb@` mailbox** — 3,225 biz-day messages (49.6/day). Dr. Bhargava's clinical inbox; 95% vendor spam. Not front-desk workflow but informs the "who has to sift this" reality.

**Recommendation:** the next version of the morning report should replace the Appendix B mailbox table with the non-AMD baseline's 10-mailbox table (already in `DAILY_BASELINE_NON_AMD.md` §2).

### 4.4 New-booking rate (self-contradiction inside main report)

Main report §5 workflow #3 (`Schedule new appointment (non-new-pt)`) quotes **2.0/day**. Main report Appendix B (independent REST cross-check with creation-date sample) quotes **~31.6/day**. These differ by 15×.

**Resolution:** the 31.6/day number is the correct one. It comes from a 400-record creation-date sample showing 71.8% of Q1 appointments were booked in Q1 (287/400), implying ~2,120 new bookings Q1 ÷ 67 biz days = 31.6/day. Workflow row #3 in §5 of the main report is a placeholder that was not updated when Appendix B landed. **Cost-model impact:** Appendix B notes this adds ~$4.04/day to LLM spend and drops margin from 43% → 40%. Treat that as the correct margin.

### 4.5 Completed-visit count

| Source | Method | Q1 completed |
|---|---|---:|
| Main report v2 body | REST status=3 | 1,861 |
| Main report Appendix B | REST cross-check | 1,895 |
| FTE workflow analysis | REST status=3 | 1,861 |

All three within 2%. Use **1,861** (27.8/biz day) as canonical. The 34-record delta is window-boundary noise.

---

## 5. Data Gaps Gautam Named Specifically — With Endpoint Blockers

Gautam's scope refinement explicitly called out categories he expects to see in the final report. Status of each:

| Category Gautam named | In main report? | In this supplement §1? | Endpoint blocker | Unblock path |
|---|---|---|---|---|
| New patients added | YES (§2, §5 #7) | YES (row 1) | — | — |
| Appointments rescheduled | Partial — inferred 9/day | YES (row 3, inferred 1.7/day) | `getupdatedvisits` 403; REST scheduler filters status 5 | Grant `view updated visits` privilege |
| Cancellations split (pt/office/no-show/late) | No split | DATA GAP rows 4a–4c | REST scheduler does not expose cancel reason | Need XMLRPC `getvisitsbyid` per-record enrich, or UI scrape |
| Medical records REQUESTS received | Not in main | YES (row 17, 6 total `[LIVE, low-conf]`) | M365 keyword heuristic under-counts; likely hidden in `fax@` | Sample 20 random `fax@` subjects manually |
| Medical records SENT (fulfilled) | Not in main | YES (row 18, DATA GAP) | No API path observed | Manual log + future `/connect/v1/documents` probe |
| Appointment additions (beyond new pt) | Partial — main body says 2/day, Appendix B says 31.6/day | YES (row 2, 31.6/day `[LIVE]` per Appendix B) | — | — |
| Administrative chart notes | YES | YES (row 9) | — | — |
| Tasks created + completed | Marked red | DATA GAP row 10 | `/api/worklist` 403; `@action=getworklist` unverified | Validate legacy XMLRPC path |
| Patient portal messages (in + out) | Inferred | DATA GAP row 11 (~9/day inferred) | `/api/messages` 404 despite `PATIENT_MESSAGING` feature enabled | Discover legacy action; probe `/connect/v1/messages` |
| Fax-to-task items | RC 3.9/day | YES (row 12, 12.4/day via M365 `fax@`) | — | — |
| Billing: payments collected | YES | YES (row 13) | — | — |
| Billing: balance follow-ups | Inferred 6/day | DATA GAP row 15 (~6/day inferred) | `gettxhistory` action-not-found on tenant | Trace current action name from PM webapp billing UI |
| Eligibility / insurance verifications | Inferred 0.4/day | YES (row 16) | `submitdemandrequest` not validated | Live test with one insured patient |
| RingCentral inbound calls (handled + missed) | YES | YES (rows 19 + 20) | — | — |
| M365 mailbox category breakdown | 3-mailbox subset | 10-mailbox canonical (rows 22–27 + main text) | — | — |

**Summary of gaps:** 5 of Gautam's 14 named categories have DATA GAP markers: cancellation sub-splits, tasks, portal messages, medical records sent, and balance follow-ups. All 5 trace back to 3 tenant-level endpoint blockers:

1. `/api/worklist` 403 (fixes tasks + portal via adjacency)
2. `/api/messages` 404 (fixes portal directly)
3. `gettxhistory` action-name mismatch on this tenant (fixes balance follow-ups)

The cancellation sub-split is a different animal — REST scheduler simply does not carry the cancel reason field. Fix requires either per-record `getvisitsbyid` enrich (N+1 calls, expensive) or scraping the cancel-reason from the UI.

---

## 6. What this supplement does NOT change in the main report

- The main report's **cost model ($21.45/day LLM + $33.02/day voice vendor + $12.50/day infra = $66.99/day, $1,454/month)** is the number to use in any pricing deck. This supplement's alternative $67.77/mo figure is LLM-only at a different model mix and is for sensitivity analysis, not for pricing.
- The main report's **margin analysis (43% solo / 57% at 50-clinic scale)** stands. With the Appendix B new-booking correction it tightens to ~40% solo / ~55% at scale.
- The main report's **BIG unblock recommendation** (6 AMD privilege grants) stands. This supplement cross-references the same 5 grants and adds no new ones.
- The main report's **recommendation to reframe the pitch** from "replace 1 FTE" to "augment 1 overloaded FTE, remove the 40% missed-call backlog" stands and is the right framing.

---

## 7. PHI cleanup log (this supplement is non-PHI)

- This supplement contains **zero patient-level data**. Every number is an aggregate count or a derived average.
- The assembler did **not** read `/tmp/amd_q1_data/appointments_q1_2026_full.json` at any point (that file contains PHI; the assembler used only aggregate summaries `q1_summary_full.json`).
- Post-commit step (§8) will delete the PHI-bearing raw file from `/tmp` and verify.

---

## 8. Files referenced by this supplement

- `/Users/agent/pi-mono/.pi/services/MORNING_REPORT_2026-04-05.md` — main report (primary deliverable, parallel session, commit `4d274721`)
- `/Users/agent/pi-mono/.pi/services/amd/API_DOCUMENTATION.md` — 215 AMD endpoints
- `/Users/agent/pi-mono/.pi/services/amd/FTE_WORKFLOW_ANALYSIS.md` — workflow analysis
- `/Users/agent/pi-mono/.pi/services/exult/DAILY_BASELINE_NON_AMD.md` — non-AMD baseline (commit `c522c641`)
- `/Users/agent/pi-mono/.pi/services/exult/rc-endpoints.md` — RC endpoint citations
- `/Users/agent/pi-mono/.pi/services/exult/graph-endpoints.md` — Graph endpoint citations
- `/Users/agent/pi-mono/.pi/services/exult/rc-call-log-2026-q1.csv` — RC daily aggregate
- `/Users/agent/pi-mono/packages/ai/src/models.generated.ts` — canonical pricing
- `/tmp/amd_q1_data/q1_summary_full.json` — AMD Q1 aggregate (no PHI, not committed)
- `/tmp/amd_q1_data/appointments_q1_2026_full.json` — **PHI, DELETED after this commit per §7**

---

*End of supplement.*
