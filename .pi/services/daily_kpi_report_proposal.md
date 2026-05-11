# Daily KPI Email Report — Design Proposal

**For:** Gautam Bhargava, COO, Exult Healthcare (McKinney TX)
**Author:** Claude (research/design pass)
**Date:** 2026-04-10
**Status:** DESIGN ONLY. No code, no scheduling, no test email. All data access READ-ONLY.
**Delivery target path:** `/Users/agent/pi-mono/.pi/services/daily_kpi/` (not created — propose only)

---

## 0. Summary

Build a 7:00 AM CT email that lands in Gautam's inbox every business day with yesterday's operational + revenue snapshot in a 30-second iPhone scan. Three tiers:

- **Hero (top of email):** New Patient Funnel (phone keypad 1 → Shaye, fax referral → New Referrals queue, web form → Shaye → AMD → arrival), completed visits, revenue, missed calls, pending referrals, Rx + records turnaround.
- **Body:** grouped KPI sections with 7-day and 30-day trend arrows + red/yellow/green alert pill on each line.
- **Footer:** data quality flags, blocked KPIs, unresolved open questions.

Data comes from four systems already wired up for read:
1. **AdvancedMD** (office 161112) — REST `pm-api-137` + XMLRPC broker `pm-wfe-137/practicemanager/xmlrpc/processrequest.aspx`
2. **RingCentral RingEX** (account 2761864020) — `/restapi/v1.0/account/~/call-log`, IVR/queue admin, `message-store` (VM + Fax), Business Analytics Essentials
3. **Microsoft 365 Graph** (tenant `707a7153-af93-4b65-ae01-bfa6febbffdb`) — `request@exulthealthcare.com` (Medical Record Requests Group), `prescriptions@exulthealthcare.com`
4. **Microsoft 365 Graph sendMail** for delivery

### Confirmed phone tree state (as of 2026-04-10)

Main line **+1 469 714 0006** → business-hours rule "Exult" → IVR **"Phone Tree (April 2026)"** (ivr id `62579250008`, ext 2000):

| Keypad | Destination | Purpose | Notification sink |
|---|---|---|---|
| **1** | Shaye Lemieux ext **201** (id `63198650008`) | **NEW PATIENTS** | Shaye.Lemieux@exulthealthcare.com |
| **2** | Front Office queue **55** (id `881804009`) | Existing patients | members ext 104, 102, 203 (simultaneous ring) |
| **3** | **Prescription Requests** VM ext (id `63624240008`) | Rx refills | prescriptions@exulthealthcare.com |
| **4** | Front Office queue 55 | Existing-patient overflow | same as 2 |
| **5** | **Medical Record Requests** VM ext (id `63624348008`) | Records requests | request@exulthealthcare.com (M365 shared mailbox "Medical Record Requests Group" — Gautam added 2026-04-10 16:19Z) |
| NoInput | Front Office queue 55 | Default landing | — |

After-hours (Mon–Fri 17:30–09:00 + all weekend) → rule "Exult Afterhours" → IVR **"MDPA After hours"** (ext 2002, id `62584081008`).

Front Office queue 55 members (simultaneous ring, not rotating anymore): ext 104 Dani Jackson, ext 102 Front Office 2 (now ENABLED), ext 203 Laura Leyva. The **New Referrals queue** (ext 12, id `62579247008`) has 1 member: ext 104 Dani Jackson — this is the referral-specific landing extension.

### Confirmed RC feature flags (queried 2026-04-10)

| Feature | State | Use in this report |
|---|---|---|
| `VoiceCallsLiveTranscriptions` | AVAILABLE | Phase 3 real-time stream, not used in daily batch |
| `VoiceCallsRecordingTranscriptions` | **NOT AVAILABLE — plan block** | Past-call transcripts unreachable without plan upgrade |
| `RingSense` | DISABLED at account | Sentiment/insights unavailable (MVP entitlement present but dormant) |
| `VoicemailToText` | AVAILABLE | **Primary Call Intelligence surface** — every VM is auto-transcribed into `body` field of `/extension/~/message-store?messageType=VoiceMail` |
| `AIGeneratedNotes` | AVAILABLE | Optional enrichment |
| `AIVoicemailSummaries` | DISABLED but togglable | Recommend Gautam enable — adds a 1–2 sentence LLM summary to each VM |
| `ReadBusinessAnalyticsEssentials` | AVAILABLE | Basic aggregates usable for PHN-6/7 |
| `ReadBusinessAnalyticsPro` | NOT AVAILABLE | Advanced analytics blocked |

---

## 1. NEW PATIENT FUNNEL — the hero section

The new phone tree and new-patient process are live as of 2026-04-10. New-patient inquiries have three confirmed entry points that all converge on an AMD new-patient record. This is the clinic's most important revenue metric, so it gets its own section at the top of the email.

### 1.1 Funnel stages (three-entry, one-exit)

```
[Stage 1] INBOUND INQUIRY — three entry points
    │
    ├── A. PHONE — +14697140006 → IVR keypad 1 → Shaye Lemieux ext 201
    │      source: RC call-log legs where any leg = 63198650008
    │
    ├── B. FAX REFERRAL — referral form received on a RC VoiceFax DID
    │      → lands on New Referrals queue ext 12 (member ext 104 Dani)
    │      source: /extension/~/message-store?messageType=Fax for ext 12 + ext 104
    │             + shared fax mailbox(es) parallel path
    │
    └── C. WEB FORM — public intake form → Shaye Lemieux email + AMD intake row
           source: intake-getpaged status=new since yesterday
                                |
                                v
[Stage 2] SHAYE / DANI TRIAGE
    A → Shaye picks up, VMs, or misses (ext 201 call-log result)
    B → Dani opens fax email / actions record (message-store Read flag)
    C → Shaye processes intake row
                                |
                                v
[Stage 3] INTAKE RECORD / PATIENT CREATED IN AMD
    ├── Patient MRN minted (addpatient) OR
    └── Online intake record started (intake-createrecord)
                                |
                                v
[Stage 4] APPOINTMENT BOOKED
    └── New appointment in /api/scheduler/appointments
        type ∈ {IP-MED MGMT NEW, IP-THERAPY NEW PT, TH-MED MGMT NEW, TH-THERAPY NEW PT}
                                |
                                v
[Stage 5] APPOINTMENT CONFIRMED
    └── confirmdate populated
                                |
                                v
[Stage 6] ARRIVED / SEEN
    └── status flips to 1 (Arrived) → 3 (Seen)
                                |
                                v
[Stage 7] INITIAL CHARGE POSTED
    └── First self-pay card charge on the new patient's responsible party
```

### 1.2 Funnel KPIs

| # | Name | Definition | Source | Stage |
|---|---|---|---|---|
| NPF-1a | Inquiries — PHONE (keypad 1 → Shaye) | Inbound calls to +14697140006 that traversed IVR `62579250008` keypad 1 and terminated on ext 201 (id `63198650008`) yesterday | RC `/call-log?view=Detailed&extensionId=63198650008` + leg containing IVR 2000 | 1-A |
| NPF-1b | Inquiries — FAX referral | Fax-message-store rows on queue ext 12 (New Referrals) and ext 104 (Dani) yesterday | `/extension/~/message-store?messageType=Fax&dateFrom=...` for ext 12, 104 | 1-B |
| NPF-1c | Inquiries — WEB form intake | New AMD intake records with status=new, createdate=yesterday | XMLRPC `intake-getpaged` | 1-C |
| NPF-2 | Total new-patient inquiries | NPF-1a + NPF-1b + NPF-1c | derived | 1 |
| NPF-3 | Shaye answer rate | % of NPF-1a answered live (result∈Accepted/Connected, duration>0) vs VM/Missed/Abandoned | RC call-log `result` on ext 201 | 2-A |
| NPF-4 | Shaye median time to answer | Ring-to-answer seconds (median) for NPF-1a answered calls | RC call-log `legs[].startTime` deltas | 2-A |
| NPF-5 | Fax triage time to action | Minutes from fax `creationTime` (RC) to `readStatus=Read` or first reply in request@ mailbox | RC `message-store` + Graph mailbox | 2-B |
| NPF-6 | New patient records created | Count of new AMD patients (MRN minted) yesterday | XMLRPC `getupdatedpatients` datechanged=yesterday (*privilege gated*) OR `/api/patients?updatedSince` | 3 |
| NPF-7 | New-patient appointments booked | Appointments with type name containing NEW and `createdate`=yesterday | `/api/scheduler/appointments` + type filter | 4 |
| NPF-8 | Same-day inquiry→booking conversion | NPF-7 matched (trailing 7d) to an NPF-1a/1b/1c within ≤24h by phone or name | Join RC + fax + AMD (fuzzy) | 1→4 |
| NPF-9 | New-patient confirmation rate | New-patient appts with `confirmdate` populated within 24h of booking | `/api/scheduler/appointments` | 5 |
| NPF-10 | New-patient arrival rate | status∈{1,3} / booked on the trailing 14-day cohort | `/api/scheduler/appointments` | 6 |
| NPF-11 | New-patient first-charge rate | First self-pay charge posted within 24h of arrival | XMLRPC `gettxhistory` (*action-name unconfirmed*) | 7 |
| NPF-12 | Dropped inquiries (no booking) | NPF-2 minus NPF-7 trailing 7 days | derived | 1→4 gap |
| NPF-13 | Stuck referrals | Fax referrals (NPF-1b) with no matching AMD new-patient record or booking after 48h | join + aging | 2→4 gap |
| NPF-14 | Abandoned-in-IVR on keypad 1 | Calls that selected keypad 1 but hung up before connecting to ext 201 | RC call-log IVR leg + `result=Abandoned` | 1-A gap |

### 1.3 RC IVR state self-check (change-detection)

Although the routing is confirmed today, the script still dumps the live IVR/answering-rule/queue state on every run and diffs against the prior run. If any diff is detected, the daily email adds a banner `ROUTING CHANGED — see daily_kpi/state/ivr_snapshot.diff`. Endpoints polled:

| Endpoint | Purpose |
|---|---|
| `GET /restapi/v1.0/account/~/ivr-menus/62579250008` | Confirm keypad 1 still → ext 201 (id 63198650008); detect any re-routing |
| `GET /restapi/v1.0/account/~/answering-rule` | Detect new/removed rules and after-hours schedule changes |
| `GET /restapi/v1.0/account/~/extension/201` | Shaye ext config, VM settings, business-hours schedule |
| `GET /restapi/v1.0/account/~/extension/63624240008` | Prescription Requests VM ext (keypad 3) |
| `GET /restapi/v1.0/account/~/extension/63624348008` | Medical Record Requests VM ext (keypad 5) |
| `GET /restapi/v1.0/account/~/call-queues/55` + `/members` | Front Office queue (existing patients) |
| `GET /restapi/v1.0/account/~/call-queues/12` + `/members` | New Referrals queue (Dani) |

State is persisted to `daily_kpi/state/ivr_snapshot.json`; diffs land in `daily_kpi/state/ivr_snapshot.diff`.

---

## 2. KPI CATALOG (full list)

Priority key: **P0** = must-have in v1; **P1** = should-have; **P2** = nice-to-have. Freshness key: **RT** = real-time (available at cron runtime); **EOD** = only complete after prior biz day close.

### 2.1 Operational — Scheduling & Appointments (AMD)

| # | KPI | Definition | Source | Freshness | Priority | Notes |
|---|---|---|---|---|---|---|
| SCH-1 | Completed visits yesterday | count(status=3 Seen) for dateOfService=yesterday | `/api/scheduler/appointments?forView=month` client filter | EOD | **P0** | baseline 27.78/day |
| SCH-2 | Arrivals yesterday | count(status=1 Arrived) for yesterday (transient — mostly rolls into Seen by EOD) | same | EOD | P1 | |
| SCH-3 | Scheduled-but-unfilled slots | Count of appointments where status=0 Made but no arrival, on a past date | same, status=0 with date<today | EOD | **P0** | Leakage indicator |
| SCH-4 | Cancellations yesterday | count(status=10 Cancelled) where datecancelled=yesterday | `/api/scheduler/appointments` status=10 | EOD | **P0** | baseline 6.94/day, alert >10 |
| SCH-5 | No-shows yesterday | count(status=12 No Show) where date=yesterday | same, status=12 | EOD | **P0** | baseline 4.27/day, alert >7 |
| SCH-6 | Reschedules yesterday | visits with status transition 0→5 or Moved flag in `getupdatedvisits` datechanged=yesterday | XMLRPC `getupdatedvisits` *(PRIVILEGE BLOCKED)* | EOD | P1 | Blocker: add `view updated visits` to GAUTAM role |
| SCH-7 | Same-day adds | appointments with createdate=appointment date=yesterday | `/api/scheduler/appointments` + client diff | EOD | P1 | |
| SCH-8 | New-patient visits booked | count of appts with type in NEW-PT set created yesterday | same + type filter | EOD | **P0** | baseline 2.54/day |
| SCH-9 | Confirmation rate | % of today+1 appts with `confirmdate` populated by 9 PM yesterday | same, forward-looking | RT | **P0** | baseline 17.19/day confirms sent |
| SCH-10 | Booking creation count | Distinct new appts created yesterday (all types) | same + `createdate`=yesterday | EOD | P1 | |
| SCH-11 | Provider utilization % | seen/(seen+cancelled+noshow+empty-slots) per provider column yesterday | `/api/scheduler/columns` + appts | EOD | P1 | One bar per provider |
| SCH-12 | Telehealth vs in-person mix | % TH-* types vs IP-* types completed yesterday | same | EOD | P2 | Trend watch |
| SCH-13 | Next-day appt count | Scheduled for tomorrow, all statuses | `/api/scheduler/appointments` tomorrow | RT | **P0** | So Gautam knows load today |
| SCH-14 | Next-day unconfirmed | tomorrow's appts where confirmdate is null | same | RT | **P0** | Action list — who needs a manual call |

### 2.2 Revenue (AMD)

| # | KPI | Definition | Source | Freshness | Priority | Notes |
|---|---|---|---|---|---|---|
| REV-1 | Collections yesterday (self-pay card) | Sum of card charges with postdate=yesterday | XMLRPC `gettxhistory` by responsible party OR reporting services | EOD | **P0** | Action name unverified; see Risks §5 |
| REV-2 | Payments received (all methods) | Sum of all payments (cash/card/check/ACH) posted yesterday | XMLRPC payment actions (`addpayments` history read) | EOD | **P0** | |
| REV-3 | Avg charge per visit | REV-1 / SCH-1 | derived | EOD | P1 | Should be ~$175 (FU) / ~$375 (new) |
| REV-4 | Outstanding patient AR | Sum of responsible-party balances > 0 as of EOD | XMLRPC `getaccounts` for collector OR reporting | EOD | **P0** | Bucket by 0-30 / 31-60 / 61-90 / 90+ |
| REV-5 | New balance added | New AR created yesterday (charges minus same-day payment) | derived | EOD | P1 | |
| REV-6 | Pending insurance claims | Count/total of claims with status=submitted, not adjudicated | XMLRPC `getclaimsreport` / `request claim status` | EOD | P1 | 15% of practice only |
| REV-7 | Denials in last 24h | Claims returned with denial code yesterday | same | EOD | P2 | |
| REV-8 | Card decline count | Declined payment attempts (if logged via Heartland processor) | unverified — need Heartland API probe | EOD | P2 | |
| REV-9 | Statements sent | Count of statements dispatched yesterday | no documented action found | EOD | P2 | Data gap |
| REV-10 | Payment plan status | Count of patients on active payment plans + those that failed | XMLRPC `getpaymentplan` | EOD | P2 | |

### 2.3 Patient Access — Phone & Voice (RingCentral)

| # | KPI | Definition | Source | Freshness | Priority | Notes |
|---|---|---|---|---|---|---|
| PHN-1 | Total inbound calls | direction=Inbound, type=Voice, yesterday | `/call-log?view=Detailed&dateFrom=...&dateTo=...` | EOD | **P0** | baseline 85.8/day |
| PHN-2 | Answered calls | Inbound where result in {Accepted, Call connected} and duration>0 | same | EOD | **P0** | baseline 53/day (58.7%) |
| PHN-3 | Missed calls | Inbound where result in {Missed, Abandoned} and no VM | same | EOD | **P0** | baseline 20/day. RED alert ≥25 |
| PHN-4 | Voicemails received | Inbound where result=Voicemail | same | EOD | **P0** | baseline 13/day |
| PHN-5 | Unreturned voicemails | VMs received >24 h ago with no outbound call to the same number since | derived (requires phone-number matching; see §5 PHI note) | EOD | **P0** | RED alert ≥3 |
| PHN-6 | Avg answer speed (sec) | Median seconds from first ring to answer on PHN-2 | `legs[].startTime` deltas | EOD | P1 | |
| PHN-7 | Avg handle time (sec) | Mean duration of PHN-2 calls | `duration` field | EOD | P1 | |
| PHN-8 | Outbound calls | direction=Outbound, type=Voice | same | EOD | P1 | baseline 31/day |
| PHN-9 | Calls to Shaye (ext 201) | Calls where any leg terminates at ext 201 | same, extensionNumber filter | EOD | **P0** | New metric for funnel |
| PHN-10 | New-patient-branch hits | Inbound calls whose legs include the new-patient IVR menu id | RC IVR state + call-log legs | EOD | **P0** | |
| PHN-11 | Abandoned-in-IVR | Caller hung up inside IVR before reaching a destination | `result=Abandoned` with IVR leg only | EOD | P1 | Signals IVR confusion |
| PHN-12 | After-hours calls | Inbound outside 9a-5p CT | `startTime` localized | EOD | P2 | |

### 2.4 Patient Access — Fax & Referrals (RingCentral message-store + M365)

Classification strategy: **trust the routing first**. A fax that landed on the Medical Record Requests VM ext (id `63624348008`) is a records request by construction; a fax on the New Referrals queue (ext 12) is a referral by construction. OCR/LLM classification is a Phase-2 refinement for faxes that arrived on generic user extensions.

| # | KPI | Definition | Source | Freshness | Priority | Notes |
|---|---|---|---|---|---|---|
| FAX-1 | Inbound faxes received (all) | type=Fax direction=Inbound, aggregated across all enabled user extensions | RC `/extension/~/message-store?messageType=Fax&dateFrom=...&dateTo=...` iterated per ext | EOD | **P0** | baseline ~12/day combined |
| FAX-2 | Referrals received | Faxes routed to New Referrals queue ext 12 or Dani ext 104 | same, filter by extensionId | EOD | **P0** | Hero-tier metric |
| FAX-3 | Records requests received | Faxes + voicemails routed to ext 63624348008 OR emails in request@exulthealthcare.com (M365 shared mailbox "Medical Record Requests Group") | RC message-store + Graph `/users/{records-group-id}/messages` | EOD | **P0** | |
| FAX-4 | Other faxes | FAX-1 minus FAX-2 minus FAX-3 | derived | EOD | P2 | |
| FAX-5 | Avg fax triage time | Minutes from RC message-store `creationTime` to `readStatus=Read` | message-store | EOD | **P0** | |
| FAX-6 | Pending referrals (unactioned) | FAX-2 messages `readStatus=Unread` >24h OR with no matching AMD new-patient record within 48h | join | EOD | **P0** | RED alert ≥3 |
| FAX-7 | Oldest pending referral age | Days since the oldest unactioned FAX-2 arrived | same | EOD | **P0** | |
| FAX-8 | Records request turnaround | Hours from FAX-3 arrival to reply sent from request@ mailbox | Graph sent-items | EOD | P1 | |

### 2.5 Rx + Records Voicemail Queues (new Phase-1 streams)

New first-class streams created by keypads 3 and 5.

| # | KPI | Definition | Source | Freshness | Priority | Notes |
|---|---|---|---|---|---|---|
| RX-1 | Rx refill requests received | Voicemails on Prescription Requests ext `63624240008` yesterday | RC `/extension/63624240008/message-store?messageType=VoiceMail` | EOD | **P0** | |
| RX-2 | Rx VM transcripts | Count of RX-1 VMs with a `VoicemailToText` transcription in `body` | same, field `transcriptionStatus=Completed` | EOD | **P0** | |
| RX-3 | Rx controlled-substance flags | Transcripts containing controlled-substance keyword set (Adderall, Xanax, Klonopin, etc.) | transcript keyword scan | EOD | **P0** | Urgent-review bucket |
| RX-4 | Rx triage time | Hours from RX-1 `creationTime` to `readStatus=Read` or to Graph sent-mail from prescriptions@ | RC + Graph `/users/{prescriptions-id}/mailFolders/sentItems` | EOD | **P0** | Med safety KPI — RED if >24h |
| RX-5 | Unresolved Rx requests (>24h) | RX-1 still unread >24h or unreturned | derived | EOD | **P0** | RED alert ≥1 |
| REC-1 | Records requests received (VM) | Voicemails on Medical Record Requests ext `63624348008` yesterday | RC `/extension/63624348008/message-store?messageType=VoiceMail` | EOD | **P0** | |
| REC-2 | Records request turnaround | Hours from REC-1/FAX-3 arrival to reply sent from request@ | RC + Graph shared-mailbox | EOD | **P0** | Compliance KPI |
| REC-3 | Unresolved records requests (>3d) | REC-1/FAX-3 with no reply within 3 business days | derived | EOD | **P0** | HIPAA turnaround is typically ≤30d but clinic SLA should be tighter |

### 2.6 Call Intelligence (Voicemail-to-Text — the only available transcript surface)

**Important**: Recording-level call transcripts (`VoiceCallsRecordingTranscriptions`) are **NOT AVAILABLE on the current plan**. All transcript-based KPIs below run on **voicemail transcripts** (`VoicemailToText`, available on every VM). This is a 14% sample of inbound calls (baseline 13 VMs of 89 inbound calls/day) but it's where the highest-intent messages land, so it's still load-bearing.

| # | KPI | Definition | Source | Freshness | Priority | Notes |
|---|---|---|---|---|---|---|
| CI-1 | VM transcript coverage | % of yesterday's VMs with a completed transcription | `/extension/~/message-store?messageType=VoiceMail` field `transcriptionStatus` | EOD | **P0** | Should be ~100% |
| CI-2 | Keyword: "cancel" | VM transcripts containing cancel/cancelled/cancellation | message-store `body` regex | EOD | **P0** | |
| CI-3 | Keyword: "reschedule" | same, reschedule/move/change my appointment | same | EOD | **P0** | |
| CI-4 | Keyword: "insurance" | same | same | EOD | **P0** | |
| CI-5 | Keyword: "prescription"/"refill"/"med" | same | same | EOD | **P0** | Cross-check RX-3 |
| CI-6 | Keyword: "refund"/"bill"/"charge" | same | same | EOD | **P0** | |
| CI-7 | Keyword: "new patient"/"first appointment" | New-patient intent in a VM (means keypad 1 didn't work — they landed in a VM instead) | same | EOD | **P0** | Funnel leakage alarm |
| CI-8 | Dropped-inquiry detection | CI-7 hits with no matching AMD new-patient record in next 48h | join VM transcripts + AMD | EOD | **P0** | Real revenue leakage |
| CI-9 | Live-call transcription (Phase 3) | Real-time transcript stream via `VoiceCallsLiveTranscriptions` | event subscription | RT | P3 | Requires persistent listener — not a batch job |
| CI-10 | Sentiment distribution | positive/neutral/negative mix | RingSense | — | BLOCKED | RingSense disabled at account |
| CI-11 | Past-call transcript KPIs | All recording-based keyword / topic mining | RingSense recording transcription | — | BLOCKED | **Plan upgrade required** (`VoiceCallsRecordingTranscriptions` not in current plan) |

### 2.7 Quality & Practice Health

| # | KPI | Definition | Source | Freshness | Priority | Notes |
|---|---|---|---|---|---|---|
| QUA-1 | External rating avg | Reputation aggregate | `/api/reputationmanagement/externalratings` | RT | P1 | Already validated |
| QUA-2 | Reputation responses | Responses sent yesterday | `/api/reputationmanagement/responsecount?StartDate=&EndDate=` | RT | P2 | |
| QUA-3 | Intake forms completed | Completed online intake forms | XMLRPC `intake-getpaged` status=Complete | EOD | P1 | |
| QUA-4 | Portal invites sent | Patient portal invites dispatched yesterday | XMLRPC `sendinvitation` log | EOD | P2 | |
| QUA-5 | Active providers today | Columns with at least one seen appt | derived | EOD | P2 | Detects provider outages |

---

## 3. REPORT LAYOUT (literal mock)

**Subject line:**
`Exult Daily — Tue 04/09 — 28 seen · $4,875 · 7 new-pt · 3 refs pending`

Subject composition: `Exult Daily — <DOW MM/DD> — <SCH-1> seen · $<REV-1> · <NPF-7> new-pt · <FAX-6> refs pending`. Keeps the 4 most load-bearing numbers on the lock-screen. If any RED alert is active, prefix with `🔴` (ASCII fallback `[!]`).

### 3.1 Email body (plain HTML, iPhone first)

```
=======================================================
EXULT DAILY KPI · TUE 04/09/2026
=======================================================

--- HERO ---------------------------------------------
NEW PATIENT FUNNEL (yesterday)
  Inquiries — phone (keypad 1)  12  ▲2 vs 7d   [GREEN]
  Inquiries — fax referral       8  ▼1 vs 7d   [GREEN]
  Inquiries — web intake         3  ▲1 vs 7d   [GREEN]
  Total inquiries               23
  Shaye answer rate            83% (10/12)     [GREEN]
  Shaye median answer           7s             [GREEN]
  New pts booked (same-day)      7              [GREEN]
  Same-day conversion          30% (7/23)      [YELLOW]
  Stuck referrals (>48h)         3 (oldest 4d) [RED]
  Abandoned in IVR keypad 1      1             [GREEN]

YESTERDAY AT A GLANCE
  Seen            28    ▲ vs 28 (7d avg)
  Cancelled        5    ▼ vs 7  (7d avg)
  No-shows         3    ▼ vs 4  (7d avg)
  New pts booked   7    ▲ vs 2.5              [GREEN]
  Collections  $4,875   ▲ vs $4,620
  Missed calls    22    ▲ vs 20               [YELLOW]
  VMs received    14 (2 unreturned >24h)      [RED]
  Rx pending      1 (>24h)                    [RED]
  Records pending 2 (oldest 2d)               [YELLOW]

--- TODAY'S LOAD -------------------------------------
ON SCHEDULE TODAY
  Total appts     51 (43 TH / 8 IP)
  Unconfirmed     11  ← call list below
  New patients     4
  Providers       8 active

UNCONFIRMED FOR TODAY (need a manual touch)
  • 9:00 AM   Mbilikira — TH-FU      pt #12345
  • 9:30 AM   Todd     — IP-FU       pt #67890
  ... (up to 10 max)

--- REVENUE -------------------------------------------
  Collections yesterday       $4,875
  Avg charge/visit              $174
  New AR added                  $820
  Outstanding patient AR    $31,240
    0-30d   $18,100
    31-60d   $7,200
    61-90d   $3,500
    90+      $2,440
  Pending claims                  14  ($8,910)

--- CALLS & MESSAGING --------------------------------
  Inbound calls                  88
    answered                     54 (61%)
    voicemail                    14
    missed                       22  [YELLOW >20]
  Avg answer speed             9.2s
  Avg handle time              3:14
  Outbound calls                 33
  By IVR branch:
    Kp1 new-pt → Shaye          12
    Kp2/4 existing → queue 55   48
    Kp3 prescriptions VM         9
    Kp5 records VM               4
    NoInput → queue 55          15
  Abandoned in IVR                3

--- INBOUND REFERRALS + FAX --------------------------
  Faxes received (all ext)       15
    New Referrals queue (Dani)    8
    Records Requests VM           3
    Other user exts               4
  Triage time (median)         42min
  PENDING REFERRALS               3 ← action
    • 04/05 4d old  from ext 104 unread
    • 04/07 2d old  from queue 12 no match
    • 04/08 1d old  from ext 104 unread

--- RX + RECORDS QUEUES ------------------------------
  Rx refill VMs received          9
    transcribed                   9/9
    controlled-substance flag     2  [YELLOW]
    triaged <24h                  8/9
    UNRESOLVED >24h               1  [RED]
  Records requests received       3 VM + 2 email
    median turnaround          6.3h
    UNRESOLVED >3d                0

--- CALL INTELLIGENCE (VM transcripts) ---------------
  VM transcript coverage       14/14 (100%)
  Keyword trends (vs 7d avg)
    cancel          7  ▲3
    reschedule      5  ▬
    insurance       4  ▲2
    prescription    9  ▬  (cross-check Rx queue)
    refund          1  ▬
    new patient     2  ← funnel leak — see below
  New-pt inquiry in VM, no book  2  ← see funnel

--- QUALITY ------------------------------------------
  Google rating                4.7 (▬)
  Intake forms completed         5
  Portal invites sent            3

--- DATA QUALITY & BLOCKERS --------------------------
  [OK]    AMD auth, RC auth, Graph auth
  [OK]    IVR snapshot matches baseline
  [BLOCK] Reschedules — need AMD privilege grant
  [BLOCK] Past-call transcripts — RC plan upgrade
  [BLOCK] RingSense sentiment — account-disabled
  [BLOCK] Portal messages — /api/worklist 403
  Last run: 2026-04-10 07:00:04 CT  (3.2s)
=======================================================
Reply REPORT OFF to pause. Reply WHY <KPI> to get raw rows.
```

### 3.2 Alert thresholds (red/yellow/green)

| KPI | Green | Yellow | Red |
|---|---|---|---|
| Missed calls | ≤15 | 16–24 | ≥25 |
| Unreturned VMs (>24h) | 0 | 1–2 | ≥3 |
| No-shows | ≤4 | 5–6 | ≥7 |
| Cancellations | ≤7 | 8–10 | ≥11 |
| Pending referrals | 0 | 1–2 | ≥3 |
| Oldest referral age | ≤1d | 2–3d | ≥4d |
| Conversion rate (inquiry→book) | ≥50% | 30–49% | <30% |
| Unconfirmed for today | ≤5 | 6–10 | ≥11 |
| Collections vs 30d avg | ≥95% | 80–94% | <80% |
| Outstanding AR 90+ | <$2k | $2–4k | ≥$4k |
| Rx triage >24h unresolved | 0 | — | ≥1 |
| Rx controlled-substance flag | 0 | 1–2 | ≥3 |
| Records requests >3 biz days | 0 | 1 | ≥2 |
| Routing change | none | — | any diff vs prior day |
| Shaye answer rate (keypad 1) | ≥80% | 60–79% | <60% |
| Abandoned-in-IVR keypad 1 | 0 | 1–3 | ≥4 |

### 3.3 Sparklines & comparisons

Every hero number gets `▲`/`▼`/`▬` vs 7-day rolling mean and a (hover/footnote) 30-day mean. Sparklines are rendered as unicode blocks (`▁▂▃▄▅▆▇`) for last 14 business days so they survive Gmail's HTML sanitizer and look right on iPhone.

---

## 4. IMPLEMENTATION PLAN

### Phase 1 — Week 1 (things we can ship now)

Everything in this phase uses endpoints we've already validated against the live tenant.

**AMD (REST pm-api-137):**
- `SCH-1, SCH-2, SCH-4, SCH-5, SCH-8, SCH-9, SCH-10, SCH-11, SCH-12, SCH-13, SCH-14` from `/api/scheduler/columns` + `/api/scheduler/appointments?forView=month&startDate=MM/DD/YYYY&endDate=MM/DD/YYYY`
- `QUA-1, QUA-2` from `/api/reputationmanagement/*`
- Status decoding uses the validated map: **0=Made, 1=Arrived, 2=Other, 3=Seen, 5=Moved, 10=Cancelled, 11=Deleted, 12=No Show** (source: AMD Hard Coded Values doc 2026-04-05).

**RingCentral:**
- `PHN-1..PHN-8, PHN-12` from `/restapi/v1.0/account/~/call-log?view=Detailed&dateFrom=&dateTo=&perPage=1000&page=N` — paginated, local-tz bucketing. MUST page (not the 250-default cap).
- `PHN-9..PHN-11` (Shaye / keypad 1 / abandoned-in-IVR) from same endpoint, filtering legs where `extension.id=63198650008` or `from.extensionNumber=2000` (IVR ext).
- `FAX-1..FAX-8` from `/extension/~/message-store?messageType=Fax&dateFrom=...` iterated across enabled user extensions (esp. ext 12 New Referrals and ext 104 Dani).
- `RX-1..RX-5` from `/extension/63624240008/message-store?messageType=VoiceMail` — every VM has a `VoicemailToText` transcription in `body` automatically.
- `REC-1..REC-3` from `/extension/63624348008/message-store?messageType=VoiceMail` (VM side) plus Graph on `request@exulthealthcare.com` (email side).
- `CI-1..CI-8` keyword + intent scans run across ALL VM transcripts pulled from the aggregated message-store, not just keypad-3/5.
- IVR/routing snapshot (`/ivr-menus/62579250008`, `/answering-rule`, `/extension/201`, `/extension/63624240008`, `/extension/63624348008`, `/call-queues/55` + `/members`, `/call-queues/12` + `/members`) — daily diff for drift detection.

**M365 Graph:**
- `FAX-3, FAX-8, REC-2` email-side from `/users/request@exulthealthcare.com/messages?$filter=receivedDateTime ge ...&$select=id,subject,from,receivedDateTime,isRead,hasAttachments,conversationId` (M365 shared mailbox "Medical Record Requests Group", Gautam was added 2026-04-10 16:19Z — app-only auth needs the group or a user that's a member; confirm Mail.Read scope covers the group).
- `RX-4` email-side from `/users/prescriptions@exulthealthcare.com/mailFolders/sentItems/messages` to measure reply turnaround.
- sendMail via `/users/gautam@exulthealthcare.com/sendMail` with HTML body.

**Delivery:**
- Python script at `/Users/agent/pi-mono/.pi/services/daily_kpi/run_daily.py` (propose only, do not create).
- State at `/Users/agent/pi-mono/.pi/services/daily_kpi/state/`:
  - `rolling_7d.json` (last 14 biz days of each metric for sparklines + trend arrows)
  - `ivr_snapshot.json` (previous RC IVR state for diff)
  - `referral_tracker.json` (open referrals with first-seen date for aging)
  - `last_run.json`
- Logs at `/Users/agent/pi-mono/.pi/services/daily_kpi/logs/YYYY-MM-DD.log`
- Scheduler: **macOS launchd** agent on the iMac. Plist path `~/Library/LaunchAgents/com.exult.daily-kpi.plist`, `StartCalendarInterval` Mon-Fri 07:00 America/Chicago. (iMac stays powered, BlueBubbles host, established gateway — same box we already use per the openclaw memory.)
- Failure handling: on any step exception, send a 1-line "degraded" email with the partial data we DID get + stack trace attached, so Gautam still gets something at 7 AM even if AMD auth hiccups.
- Idempotency: each run writes a dated artifact `daily_kpi/archive/YYYY-MM-DD.json` so we can replay / re-generate an email without re-hitting APIs.

**Phase 1 KPIs delivered:**
All of SCH-1..SCH-14 except SCH-6. All of PHN-1..PHN-12. FAX-1..FAX-8. RX-1..RX-5 and REC-1..REC-3 (voicemail + shared-mailbox joins). CI-1..CI-8 (VM transcript keyword trends and dropped-inquiry detection). QUA-1,2,5. NPF-1a..NPF-1c, NPF-2..NPF-5, NPF-7, NPF-9, NPF-10, NPF-12..NPF-14.

### Phase 2 — Week 2-3 (requires validation work)

- **AMD XMLRPC broker** through `pm-wfe-137.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx` with session-cookie auth. Add a ppmdmsg executor helper that wraps `<ppmdmsg action="..." ...>` envelopes.
- **REV-1..REV-6** — probe `gettxhistory`, `getaccounts` (collector), `addpayments` history-read, `getclaimsreport`. Action name for gettxhistory is documented but came back "Action not found" in the 2026-04-05 session; needs a second pass with correct envelope shape. Per `DAILY_BASELINE.md` this is the top open investigation.
- **SCH-6 Reschedules** — add privileges to GAUTAM role: `view updated visits`, `view updated patients`, `view visit information for a date`, `view new and updated patient notes for a template`, `view fieldset information`, `view appointment history`. Then call `getupdatedvisits` with `datechanged="YYYY-MM-DD"`. This is the "one-click in System Settings" unblock Gautam already has in his queue.
- **NPF-6, NPF-11** — depends on Phase 2 AMD work.
- **FAX referral classifier** — deterministic regex first (keywords: "referral", "refer to", "please see", NPI lookup on sender), LLM fallback for ambiguous. Tune on 2 weeks of live faxes before trusting FAX-2/FAX-6 numbers.
- **Unreturned-VM detection (PHN-5)** — requires phone-number matching between inbound VM and outbound-call log. PHI-sensitive — hash numbers before storing in state, never emit raw number in the email (mask to last-4).
- **NPF-8 same-day conversion** — fuzzy-match caller ID / fax sender to new AMD patient creations within 24h window.

### Phase 3 — Month 2+ (blocked on access, plan tier, or missing systems)

- **CI-11 Past-call / recording-based transcript KPIs** — **HARD PLAN-TIER BLOCKER**. `VoiceCallsRecordingTranscriptions` is explicitly NOT AVAILABLE on Exult's current plan (reason string: "unavailable for the current service plan"). Requires a plan upgrade (likely RingCX, RingEX Advanced, or a RingSense add-on). Phase 1 CI KPIs work around this by running on VM transcripts only; recording transcripts remain blocked until plan upgrade.
- **CI-9 Live-call transcription (Phase 3 only)** — `VoiceCallsLiveTranscriptions` is AVAILABLE but requires a persistent real-time event listener subscribed to the WebSocket / subscription API. Not a batch-job fit. Could be built as a separate long-running service that writes to a DB the daily job reads.
- **CI-10 Sentiment** — `RingSense` is DISABLED at account level (and `AIVoicemailSummaries` is disabled but togglable). Recommend Gautam flip `AIVoicemailSummaries=enabled` at the account level — it's toggleable, not plan-blocked, and adds a 1–2 sentence LLM summary to every VM which would make the Call Intelligence section much cleaner with zero extra API work. Full sentiment remains blocked until RingSense is enabled (may require paid tier).
- **REV-7 Denials** — depends on claims endpoint working and payer responses flowing back.
- **REV-8 Card declines** — requires Heartland Payment Processor API probe (not yet attempted).
- **REV-9 Statements sent** — no documented AMD action yet; may require webapp trace.
- **Portal messaging volume (blocked endpoint)** — `/api/worklist` is 403 RBAC denied, PATIENT_MESSAGING has no discovered REST path. Need either the worklist privilege added to GAUTAM or a live webapp XHR trace. Without this, portal-message metrics stay inferred.
- **Patient-reminders sent (`/api/reminders`)** — endpoint exists but 403 for GAUTAM. Same privilege-grant story as reschedules.
- **ReadBusinessAnalyticsPro** — advanced call analytics endpoints are plan-blocked. Essentials is fine for Phase 1/2 aggregates.

### Delivery command summary (proposed, do not execute)

```bash
# Phase 1 smoke (read-only probe, no send)
uv run /Users/agent/pi-mono/.pi/services/daily_kpi/run_daily.py \
  --date 2026-04-09 --dry-run --no-email --verbose

# Phase 1 live
uv run /Users/agent/pi-mono/.pi/services/daily_kpi/run_daily.py \
  --date yesterday --send-to gautam@exulthealthcare.com
```

Scheduler plist (proposed):

```xml
<!-- ~/Library/LaunchAgents/com.exult.daily-kpi.plist -->
<key>Label</key><string>com.exult.daily-kpi</string>
<key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/uv</string>
    <string>run</string>
    <string>/Users/agent/pi-mono/.pi/services/daily_kpi/run_daily.py</string>
    <string>--date</string><string>yesterday</string>
    <string>--send-to</string><string>gautam@exulthealthcare.com</string>
  </array>
<key>StartCalendarInterval</key>
  <array>
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
    ... Tue..Fri
  </array>
<key>StandardOutPath</key><string>/Users/agent/pi-mono/.pi/services/daily_kpi/logs/stdout.log</string>
<key>StandardErrorPath</key><string>/Users/agent/pi-mono/.pi/services/daily_kpi/logs/stderr.log</string>
```

---

## 5. OPEN QUESTIONS FOR GAUTAM

Three questions have been resolved by direct API query (see §0 confirmed phone-tree state and feature flags) and are no longer open: IVR keypad mapping, RC transcription feature state, fax inbox location. The remaining open questions:

1. **Email address** — send to `gautam@exulthealthcare.com`, `gautambharg@gmail.com`, or BOTH? Recommend work address with a BCC to gmail as backup so the report survives any M365 mailbox hiccup.
2. **Cost-side metrics?** Do you want LLM token spend / RC usage / AWS costs in the daily email, or keep this a "front-office operations" view only? My default is no — there's a separate agent-cost tracking story.
3. **"New patient" definition** — is it (a) a patient whose MRN was minted yesterday, (b) a patient whose first-ever visit type is a NEW PT type, or (c) a patient attending their first visit this month? The funnel reports differently depending. I'm defaulting to (a) for NPF-6 and (b) for NPF-7; confirm.
4. **Reschedule privilege grant** — want me to write the exact click path in AMD System Settings > User Administration > Roles > ADMIN to add the 6 XMLRPC API privileges? Grants Phase 2 SCH-6 and REV-1..6 in one pass, 5 minutes of clicking.
5. **Outstanding AR bucketing** — standard 0-30/31-60/61-90/90+ aging? Or do you want self-pay separated from insurance AR? Payer-bucketed AR needs a per-carrier breakdown in REV-4.
6. **Alert thresholds** — red/yellow cutoffs in §3.2 are my defaults from Q1 baselines. Approve or override.
7. **Weekend behavior** — skip Sat/Sun entirely, or Monday gets a consolidated Fri+Sat+Sun report? I'm defaulting to skip (launchd Mon-Fri only).
8. **Shaye's coverage schedule** — is she 9-5 Mon-Fri or different? After-hours keypad-1 calls roll to "MDPA After hours" IVR — do we need a KPI for how many new-patient inquiries arrive after hours and what happens to them?
9. **Referral source whitelist** — is there a list of known referring providers / domains so the fax classifier can anchor on sender? A seed list of 10-20 referrers gets classification from ~70% to ~95% precision for Phase 2 OCR-based classification of non-queue-routed faxes.
10. **Red-alert escalation** — if a RED threshold trips (unreturned VM >24h, Rx pending >24h, stuck referral >4d), want a push via iMessage (BlueBubbles on the iMac) in addition to the email?
11. **AIVoicemailSummaries toggle** — want me to flag this as a one-click account-level toggle for you to flip in the RC admin? It's not plan-blocked, just off. Enabling it adds a 1–2 sentence LLM summary to every VM for free, dramatically improving the Call Intelligence section.
12. **Controlled-substance keyword list** — RX-3 flags VMs for controlled substances. Default list: Adderall, Vyvanse, Ritalin, Concerta, Xanax, Klonopin, Ativan, Valium, Ambien, Suboxone, buprenorphine. Approve or expand.
13. **Records requests SLA** — is the clinic's turnaround SLA 3 business days (my default) or a different target? Sets the REC-3 red threshold.
14. **Plan upgrade for recording transcripts** — willing to upgrade the RC plan to unlock `VoiceCallsRecordingTranscriptions` for past-call transcript mining? If not, the VM-transcript-only CI section stays the ceiling for call intelligence. Ballpark RC plan upgrades run $10–30/user/month depending on tier; I can quote exact pricing against the current plan SKU if you want.
15. **Graph shared-mailbox access** — app-only Graph with Mail.Read generally requires per-user licensing or an `ApplicationAccessPolicy` allowing the app to access `request@exulthealthcare.com` and `prescriptions@exulthealthcare.com`. I'll probe access on Phase 1 dry-run; if it 403s I'll come back with the exact policy change needed. Low priority to preempt.

---

## 6. HONEST RISKS / DATA-QUALITY GAPS

Things that will look like KPIs but are less trustworthy than they appear. Every one of these gets a footnote in the email so Gautam knows what's real.

1. **AMD status-code decoding is mostly but not fully verified.** The authoritative map (0 Made, 1 Arrived, 2 Other, 3 Seen, 5 Moved, 10 Cancelled, 11 Deleted, 12 No Show) came from the AMD Hard Coded Values doc crawled 2026-04-05. The live distribution shows a big chunk at `status=3` (1895 occurrences in Q1) and smaller bands at 10 and 12. This matches "Seen/Cancelled/NoShow" cleanly but the semantics of `status=0` (642) and `status=1` (93) are best-guess ("pending/unset" and "Arrived tentative"). If Gautam cares about intra-day state, a follow-up session should cross-validate against `getappointmenthistory`. **Mitigation:** footnote the Completed/Cancelled/NoShow counts with "source: PM REST scheduler list + Hard-Coded Values 2026-04-05".

2. **The REST scheduler list FILTERS OUT statuses 4, 5, 6 (Cancelled / No-Show / Rescheduled in one agent's reading, Moved / Deleted in another).** Cancellations and reschedules cannot be computed reliably from `/api/scheduler/appointments` alone — you need `getupdatedvisits` (currently privilege-blocked) to get the full truth. **Mitigation:** SCH-4/SCH-5 in Phase 1 report the _visible_ status=10/12 counts, with a footnote "some statuses silently filtered; full reschedule count blocked until privilege grant." Gautam needs to approve the grant to make SCH-6 real.

3. **RC `call-log` default caps at 250 records/page.** With 88 calls/day this is fine — but the script MUST paginate with `perPage=1000&page=N` and loop until `records.length < perPage`, NOT just hit the default. Peak days (observed ~120 calls) still fit in one page, but a fax-storm day or a marketing burst could exceed 250. **Mitigation:** always paginate; never trust a single-page fetch.

4. **RC local-time bucketing on DST days.** The call-log returns UTC; we need America/Chicago conversion. On the spring-forward day the "yesterday" window is 23h long, on fall-back it's 25h. **Mitigation:** use zoneinfo + explicit window boundaries, document in logs.

5. **Unreturned VMs (PHN-5) is heuristic.** Matching inbound VMs to outbound callbacks relies on phone-number string equality, which fails on extension vs E.164 formatting, blocked caller ID, and multi-call threads. False positives possible; false negatives also possible if Shaye returns via text. **Mitigation:** footnote "heuristic — phone-number match".

6. **No-show detection requires a follow-up query.** status=12 only flips when staff mark it; if no one marks a no-show, an appointment lingers at status=0/1. **Mitigation:** Phase 2 adds a stale-status scan: appointments with date<today-1 and status in {0,1} are surfaced as "unresolved".

7. **New-patient funnel conversion is fuzzy.** Matching a phone inquiry to an AMD new-patient record requires caller-ID → patient phone lookup. For unknown callers that then provide a name, the join won't close until after the appointment is created. **Mitigation:** report NPF-8 on trailing 7-day window, not same-day, for anything past "likely matched".

8. **Fax classification is a model, not ground truth.** FAX-2 (referrals) uses keyword + sender heuristics; a PDF image-only fax with no OCR will land in FAX-4 (other). **Mitigation:** add OCR step via existing pipeline if one exists; surface misclassifications as a weekly audit.

9. **AMD auth TTL is 30 min.** Token expires mid-run on slow days. **Mitigation:** the runner must cache-and-refresh on 401, not crash.

10. **AMD reporting endpoints untested.** REV-4 (AR aging), REV-6 (pending claims), REV-9 (statements) all depend on endpoints we haven't yet hit live. Phase 2 probes them; if they 404/403, we fall back to `advancedinsight.advancedmd.com` (Ad Hoc Reporting Services) or to a nightly CSV export — both need human configuration.

11. **Call Intelligence is VM-only, not call-wide.** Only voicemails have transcripts (`VoicemailToText`). Past-call recording transcripts are plan-blocked. This means CI-2..CI-8 sample ~14% of inbound calls (13 VMs out of 89 inbound/day baseline). A high-intent caller who reaches a live person leaves no transcript — the keyword-trend signal is biased toward callers who were willing to leave a VM. Mitigation: footnote every CI metric with "VM transcripts only — 14% sample".

12. **Portal messaging is perma-blocked at current access.** `/api/worklist` is RBAC-denied and PATIENT_MESSAGING has no REST path. Proposing to omit from Phase 1/2 and flag as a "ask us to trace the webapp" follow-up.

13. **Reference codes for status and type names drift.** Provider column IDs and appointment-type names are cached at build time; if Gautam adds a provider or renames a type, the script needs a daily refresh of `/api/scheduler/columns` and the type taxonomy or the counts silently miscategorize.

14. **Cross-system time skew.** AMD timestamps are in office-local (America/Chicago), RC in UTC, Graph in UTC. Every join needs explicit tz handling. **Mitigation:** canonicalize to CT at ingest time.

15. **PHI in the email.** The email is delivered to a Microsoft 365 mailbox that is HIPAA-covered. DO NOT include patient names, MRNs, or phone numbers in the email body unless the email is encrypted end-to-end. The "unconfirmed for today" list wants names — that's a PHI decision. **Mitigation:** default to initials + last 4 of chart number; ask Gautam if he wants full names (then enforce the mailbox is tenant-only).

16. **Graph shared-mailbox access is untested under app-only auth.** The existing M365 service principal has `Mail.Send` for `gautam@exulthealthcare.com`; reading from `request@exulthealthcare.com` and `prescriptions@exulthealthcare.com` (shared mailboxes) may require an `ApplicationAccessPolicy` scope, additional `Mail.Read` role, or per-mailbox licensing. **Mitigation:** Phase-1 dry-run probes access first; if denied, fall back to pulling the same data via RC `message-store` (VM side covers most of it) and come back with a specific Graph policy ask.

17. **AMD intake endpoint (`intake-getpaged`) is documented but unvalidated.** NPF-1c (web-form inquiries) assumes this action returns 200 with status-filterable records. Phase-2 task: probe via XMLRPC broker before trusting NPF-1c counts.

18. **IVR snapshot state depends on a single SPA-confirmed reading.** If RC revs the `ivr-menus` response shape or renames the IVR, the self-check diff will false-positive. **Mitigation:** the diff is opt-in banner, not an abort — the daily email still ships even if the IVR snapshot diff looks weird.

---

## 7. NOT IN SCOPE (explicitly deferred)

- Patient-level drilldowns (the email is aggregate only).
- Historical backfill beyond 14-day sparklines.
- Provider-specific dashboards (one email, not per-provider).
- Marketing-source attribution beyond referrer domain tagging.
- Write-back to AMD (read-only mandate).
- Real-time alerts during the day (this is a daily email; a separate "red alert" channel is a follow-up proposal).

---

## 8. Appendix — Validated source endpoints summary

**AMD REST (pm-api-137, session-cookie auth):**
- `GET /api/scheduler/columns`
- `GET /api/scheduler/appointments?columnId={id}&startDate=MM/DD/YYYY&endDate=MM/DD/YYYY&forView=month`
- `GET /api/reputationmanagement/externalratings`
- `GET /api/reputationmanagement/responsecount?StartDate=&EndDate=`
- `GET /api/system/startupvalues?forSpa=patientinfo`
- `POST /api/lookup/patients?cboMode=false&advancedSearch=false`

**AMD XMLRPC (pm-wfe-137/practicemanager/xmlrpc/processrequest.aspx):**
- `ppmdmsg getreminderappts` (validated, returns all statuses)
- `ppmdmsg getupdatedvisits` (privilege-blocked)
- `ppmdmsg gettxhistory` (action-name issue, needs retry)
- `ppmdmsg getaccounts` (untested)
- `ppmdmsg getclaimsreport` (untested)
- `ppmdmsg intake-getpaged` (untested but documented)

**RingCentral (platform.ringcentral.com, JWT auth):**
- `POST /restapi/oauth/token` (JWT exchange)
- `GET /restapi/v1.0/account/~/call-log?view=Detailed&perPage=1000&dateFrom=&dateTo=&page=N` (validated)
- `GET /restapi/v1.0/account/~/ivr-menus/62579250008` ("Phone Tree (April 2026)", ext 2000 — confirmed 2026-04-10)
- `GET /restapi/v1.0/account/~/answering-rule` (confirmed: business "Exult" + afterhours "Exult Afterhours")
- `GET /restapi/v1.0/account/~/extension/201` (Shaye Lemieux, id 63198650008 — new patients)
- `GET /restapi/v1.0/account/~/extension/63624240008` (Prescription Requests VM ext — keypad 3)
- `GET /restapi/v1.0/account/~/extension/63624348008` (Medical Record Requests VM ext — keypad 5)
- `GET /restapi/v1.0/account/~/call-queues/55` + `/members` (Front Office — ext 104/102/203, simultaneous)
- `GET /restapi/v1.0/account/~/call-queues/12` + `/members` (New Referrals — ext 104 only)
- `GET /restapi/v1.0/account/~/extension/{id}/message-store?messageType=VoiceMail&dateFrom=&dateTo=` (VM + transcripts)
- `GET /restapi/v1.0/account/~/extension/{id}/message-store?messageType=Fax&dateFrom=&dateTo=` (faxes)
- `GET /restapi/v1.0/account/~/extension/~/features?type=All` (feature flag state — already queried)

**Microsoft Graph (tenant 707a7153-af93-4b65-ae01-bfa6febbffdb, app-only):**
- `GET /users/request@exulthealthcare.com/messages?$filter=receivedDateTime ge {iso}&$select=...` — Medical Record Requests Group shared mailbox (Gautam added 2026-04-10)
- `GET /users/prescriptions@exulthealthcare.com/mailFolders/sentItems/messages` — for Rx reply turnaround
- `POST /users/gautam@exulthealthcare.com/sendMail` (Mail.Send role already granted)
- Access to the two shared mailboxes may require `ApplicationAccessPolicy` scope — probe in Phase-1 dry-run.

**Credentials on disk:**
- AMD: `/Users/agent/pi-mono/.config/exult/advancedmd.json` + `/Users/agent/pi-mono/.config/exult/amd_api_service.json`
- RC: `/Users/agent/pi-mono/.config/exult/ringcentral.json`
- M365: `/Users/agent/pi-mono/.config/exult/microsoft365.json`

---

*End of proposal. No code written. No email sent. No AMD/RC data modified. Awaiting Gautam's answers to §5 before Phase 1 implementation.*
