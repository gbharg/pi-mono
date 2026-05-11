# Exult Healthcare — Full Front-Office Daily Workload Summary

**Window:** Q1 2026 (Jan 1 – Apr 5), 65 business days
**Purpose:** Direct answer to "what does a full-time front-office person handle per day across all workflows"
**Data sources:** AdvancedMD PM API (live Q1 pull), RingCentral call log (live Q1 pull), Microsoft Graph (3 front-office mailboxes + fax@), all cross-referenced and committed to this repo. See `MORNING_REPORT_2026-04-05.md` for full source citations and cost model.

---

## The one-number answer

**~325 discrete workflow touchpoints per business day.** That's the total count of calls answered, appointments booked/confirmed/cancelled, charges posted, notes filed, emails triaged, faxes handled, and portal items processed in an average Mon–Thu business day at Exult. Fridays run ~55% of that load. Peak days hit ~400.

For a 480-minute shift, that is **~1.35 minutes per touchpoint average**, but the distribution is bimodal — a phone call takes 2.5–4 minutes, a fax triage takes 30 seconds. The 687 min/day billable load from the FTE analysis is this same pool of work weighted by realistic handle time.

---

## Per-business-day breakdown by category

### 1. Phone workflows (the biggest bucket — 143 touchpoints/day)

| Workflow | Per day | Source | Auto grade |
|---|---:|---|:---:|
| Inbound voice calls, total | **89** | RC live (5,577 Q1) | — |
| &nbsp;&nbsp;— answered by human | 53 | RC live, 58.7% | Y |
| &nbsp;&nbsp;— voicemail | 13 | RC live, 14.7% | Y |
| &nbsp;&nbsp;— missed (need callback) | 20 | RC live, 22.2% → **36.8% total miss rate** | Y |
| Outbound voice (callbacks, confirms, collections) | 31 | RC live (2,027 Q1) | Y |
| Inbound fax (RC fax channel) | 3 | RC live | Y |
| Inbound fax (fax@ mailbox — separate route) | 12 | M365 Graph — **804 Q1 faxes**, supplement caught this | Y |

**Total voice + fax touchpoints/day: 143** (about 45% of all front-office work)
**Live talk time: ~1.96 hours/day** of the 8-hour shift. The other 6 hours are the non-voice work below.

### 2. Scheduling & appointments (116 touchpoints/day)

| Workflow | Per day | Source | Auto grade |
|---|---:|---|:---:|
| Appointments on schedule (all statuses) | **54** | AMD live — 3,591 Q1 | — |
| &nbsp;&nbsp;— completed visits (status=3) | 28 | AMD live — 1,861 Q1 | Y |
| &nbsp;&nbsp;— new bookings actually created | **32** | AMD creationdate sample — **10× the original estimate** | Y |
| &nbsp;&nbsp;— confirmation calls/texts sent | 17 | AMD confirmdate — 1,152 Q1 | G |
| &nbsp;&nbsp;— cancellations processed | 7 | AMD status=10 — 465 Q1 | Y |
| &nbsp;&nbsp;— no-shows flagged + followed up | 4 | AMD status=12 — 286 Q1 | Y |
| &nbsp;&nbsp;— reschedules (inferred, blocked endpoint) | ~9 | needs privilege grant | Y |
| New patient intakes (packet + portal invite) | 2.5 | AMD live — 170 Q1 | Y |
| Demographic updates (phone + corrections) | 4 | inferred | Y |

**Total scheduling touchpoints/day: ~116** (about 36% of all work, highest business value)

### 3. Billing & payments (34 touchpoints/day)

| Workflow | Per day | Source | Auto grade |
|---|---:|---|:---:|
| Self-pay card charges at time of visit | 24 | 28 completed × 85% self-pay (live) | Y |
| Patient balance lookups | 6 | inferred | G |
| Statement dispatches (unpaid balances) | 3 | inferred | Y |
| Card decline follow-ups | 1 | inferred (2-3% of charges) | Y |
| Insurance eligibility checks | 0.4 | live (2.54 new × 15% insured) | Y |

**Total billing touchpoints/day: ~34**

### 4. Messaging & communications (40 touchpoints/day)

| Workflow | Per day | Source | Auto grade |
|---|---:|---|:---:|
| Email office@ triage | 18 | M365 Graph live | Y |
| Email exult-info@ triage | 9 | M365 Graph live | Y |
| Portal message triage | ~9 | endpoint blocked, inferred | R |
| Internal tasks / inbox items | 4 | inferred | R |

**Total messaging touchpoints/day: ~40**

### 5. Clinical support (front-desk side — 34 touchpoints/day)

| Workflow | Per day | Source | Auto grade |
|---|---:|---|:---:|
| Chart note routing / filing | 28 | 1 per completed visit | Y |
| Rx refill request intake | 3 | inferred | R |
| Chart scan / upload admin | 2 | inferred | Y |
| Records requests fulfilled | 0.3 | may be higher via fax@ — data gap | R |
| Prior-auth form prep | 0.3 | inferred | R |

**Total clinical-support touchpoints/day: ~34**

### 6. Admin overhead (~3 touchpoints/day)

| Workflow | Per day | Source | Auto grade |
|---|---:|---|:---:|
| Portal invite sends | 2.5 | = new patient rate | G |
| End-of-day close / batch report | 1 | standing task | R |

---

## Grand total per business day

| Category | Touchpoints | % of total |
|---|---:|---:|
| Phone + fax | **143** | 44% |
| Scheduling + appointments | **116** | 36% |
| Billing + payments | **34** | 10% |
| Messaging + comms | **40** | 12% |
| Clinical support | **34** | 10% |
| Admin overhead | **3** | 1% |
| **TOTAL** | **~325 touchpoints/day** | 100%+ (overlap) |

(Categories overlap because a single cancellation can generate 1 phone call + 1 schedule update + 1 statement = 3 touchpoints.)

**Weighted by realistic handle time: 687 minutes/day billable work = 1.43 FTEs of load through one person.**

---

## Q1 2026 four-month totals (for workflow volume math)

| Metric | Q1 2026 total | Per biz day | Source |
|---|---:|---:|---|
| Inbound voice calls | 5,577 | 85.8 | RC live |
| Outbound voice calls | 2,027 | 31.2 | RC live |
| Voicemails received | 849 | 13.1 | RC live |
| Missed calls (no live human) | 1,301 | 20.0 | RC live |
| Inbound faxes (fax@ email route) | 804 | 12.4 | M365 live |
| **Appointments scheduled (all statuses)** | **3,591** | **53.6** | AMD live |
| &nbsp;&nbsp;— Completed visits | 1,861 | 27.8 | AMD live |
| &nbsp;&nbsp;— Cancellations | 465 | 6.94 | AMD live |
| &nbsp;&nbsp;— No-shows | 286 | 4.27 | AMD live |
| &nbsp;&nbsp;— Reschedules (inferred) | ~590 | ~9 | blocked |
| Appointment confirmations sent | 1,152 | 17.19 | AMD live |
| New patient intakes | 170 | 2.54 | AMD live |
| Self-pay card charges (est) | ~1,582 | ~24 | 85% × completed |
| Chart notes routed/filed | ~1,861 | 27.8 | 1 per visit |

**Active patient panel:** 878 (85.3% self-pay). **Unique patients seen in Q1:** 636 = 72.4% of the panel saw a provider. **Providers:** 11 seeing patients across 14 scheduler columns at 2 locations.

---

## What this means for the automation pitch

1. **Phone is the biggest fire.** 143 phone+fax touchpoints/day is 44% of all front-office work. 20/day missed calls + 13/day voicemails = 33/day reactive callback queue. Automating voice triage is the single highest-value move.

2. **Scheduling is dense but bounded.** 116 touchpoints/day across booking, confirming, cancelling, rescheduling. All well-defined API operations once the 6 AMD privilege grants land. This is the second-biggest leverage bucket.

3. **The 687-min load is real and the FTE is overloaded.** One person is running 1.43 FTEs of touchpoint work. Even if automation only covers 50%, it brings the load back under a single 8-hour shift — that is the defensible pitch.

4. **The records-request path is a data gap.** 804 Q1 faxes received but only ~20 match records-request keywords in email. The other ~780 are either clinical results, insurance EOBs, or referrals. Worth a 15-minute manual sample to classify before sizing the automation.

5. **The cost to run an agent against this load: $66.99/day all-in = $1,454/mo per clinic** (LLM $21 + voice $33 + infra $13). At a $2,550/mo price point that's **43% solo gross margin**, **57% at 50-clinic scale**. See §7 of `MORNING_REPORT_2026-04-05.md` for the full COGS table and break-even analysis.

---

*Companion to `MORNING_REPORT_2026-04-05.md` (commit `4d274721`). Numbers here are all taken from that report's live-data sections, restructured as a direct answer to "what does the front office handle per day." No new claims.*
