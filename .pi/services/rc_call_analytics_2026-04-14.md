# RingCentral Call Analytics Report

**Period:** April 5-12, 2026 (7 days)
**Generated:** April 14, 2026
**Source:** RC Call Log API (611 records, Detailed view)
**Business days in window:** Mon Apr 6 - Thu Apr 10 (Fri Apr 11 = Good Friday, likely closed)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total calls | 611 |
| Inbound | 403 (66%) |
| Outbound | 208 (34%) |
| Answered | 449 |
| Missed (no answer) | 61 |
| Voicemail | 52 |
| Blocked/Spam | 21 |
| **Inbound miss rate** | **27.4%** (missed + VM / inbound, biz days) |
| **Voicemail return rate** | **34.6%** (only 18 of 52 VMs returned) |
| **Needs follow-up** | **38 callers** (missed, no callback, never got through) |
| Avg inbound call duration | 3.7 min |
| Avg outbound call duration | 2.4 min |

**Key finding:** Over 1 in 4 inbound calls go unanswered. Voicemail return rate is under 35%. 38 unique callers were missed with no callback and never successfully reached the office.

---

## 1. Daily Breakdown

| Date | Day | Total | Inbound | Outbound | Answered | Missed | VM |
|------|-----|------:|--------:|---------:|---------:|-------:|---:|
| Apr 5 | Sat | 1 | 1 | 0 | 1 | 0 | 0 |
| Apr 6 | Sun | 115 | 65 | 50 | 89 | 5 | 15 |
| Apr 7 | Mon | 122 | 78 | 44 | 89 | 11 | 12 |
| Apr 8 | Tue | 100 | 82 | 18 | 66 | 18 | 9 |
| Apr 9 | Wed | 119 | 83 | 36 | 94 | 8 | 1 |
| Apr 10 | Thu | 143 | 83 | 60 | 105 | 13 | 15 |
| Apr 11 | Fri | 5 | 5 | 0 | 5 | 0 | 0 |
| Apr 12 | Sat | 6 | 6 | 0 | 0 | 6 | 0 |
| **TOTAL** | | **611** | **403** | **208** | **449** | **61** | **52** |

**Note:** Apr 6 (Sunday) shows 115 calls, which is unusual -- this may be a holiday make-up day or an on-call shift. Apr 11 (Good Friday) was essentially closed.

**Worst day for missed calls:** Tuesday Apr 8 with 18 missed and 9 VMs (33% miss rate on 82 inbound).

---

## 2. Per-Extension Volume Ranking

| Extension | Inbound | Outbound | Answered | Missed | VM | Duration |
|-----------|--------:|---------:|---------:|-------:|---:|---------:|
| Dani Jackson (Ext 104) | 116 | 787 | 245 | 22 | 30 | 18.3 hrs |
| Front Office 4 | 0 | 668 | 35 | 0 | 0 | 2.0 hrs |
| Front Office 2 | 3 | 229 | 67 | 2 | 0 | 3.9 hrs |
| Raj Bhargava (Direct) | 213 | 7 | 218 | 0 | 0 | 2.6 hrs |
| Laura Leyva | 3 | 194 | 72 | 0 | 0 | 4.2 hrs |
| All Line Pick Up (Queue) | 173 | 0 | 92 | 80 | 1 | 7.6 hrs |
| MDPA 1 (Sherman) | 1 | 153 | 0 | 1 | 0 | 0.4 hrs |
| Exult Line | 99 | 17 | 115 | 1 | 0 | 1.9 hrs |
| Shaye Lemieux | 8 | 28 | 10 | 0 | 5 | 0.4 hrs |
| Prescription Requests | 10 | 0 | 0 | 2 | 8 | 0.1 hrs |
| Medical Record Requests | 7 | 0 | 0 | 4 | 3 | <0.1 hrs |

**Observations:**
- **Dani Jackson** handles the overwhelming majority of calls (18.3 hrs talk time). She is the single point of failure for the front desk.
- **Front Office 4** makes 668 outbound legs but takes zero inbound -- it is only used for outbound dialing or queue overflow.
- **Queue (All Line Pick Up)** sees 173 inbound calls but has an 80-call miss count in its routing, indicating the rotating ring group frequently fails to connect.
- **Prescription Requests** and **Medical Record Requests** lines go almost entirely to voicemail -- no one is picking up these dedicated lines.

---

## 3. Inbound Calls by Phone Line

| Line | Number | Total | Answered | Missed | VM | Miss Rate |
|------|--------|------:|---------:|-------:|---:|----------:|
| Main Line | (972) 369-4220 | 163 | 106 | 18 | 29 | 28.8% |
| Exult Line 2 | (469) 714-0006 | 103 | 86 | 11 | 5 | 15.5% |
| Sherman Line | (903) 892-0751 | 52 | 39 | 3 | 9 | 23.1% |
| Direct 4282 | (469) 436-4282 | 22 | 14 | 6 | 2 | 36.4% |
| Sherman Line 2 | (903) 892-9694 | 11 | 8 | 0 | 1 | 9.1% |
| Dallas Direct | (214) 585-4545 | 9 | 0 | 6 | 3 | **100%** |
| Direct 0916 | (903) 487-0916 | 9 | 8 | 1 | 0 | 11.1% |
| Direct 4323 | (469) 436-4323 | 3 | 0 | 3 | 0 | **100%** |

**Critical:** The Dallas Direct line (214-585-4545) has a **100% miss rate** -- 9 calls, zero answered. Direct 4323 also has 100% miss rate. These lines need immediate attention (likely no one assigned or phone unplugged).

---

## 4. Queue Performance (Ext 55 / All Line Pick Up)

| Metric | Value |
|--------|-------|
| Calls routed through queue | 172 |
| Answered from queue | 126 (73.3%) |
| Went to voicemail | 27 (15.7%) |
| Missed from queue | 19 (11.0%) |
| Avg answered call duration | 5.4 min |
| Avg wait before miss/VM | 1.7 min |

**Ring group members receiving FindMe rings:**

| Extension | Ring Attempts |
|-----------|-------------:|
| Front Office 4 | 250 |
| Dani Jackson (Ext 104) | 193 |
| Front Office 2 | 173 |
| Laura Leyva | 160 |
| MDPA 1 (Sherman) | 151 |

The queue is in **rotating mode**, which means it picks a different extension each time rather than ringing all simultaneously. When the first extension misses, it rotates to the next. This causes delays -- callers wait through multiple ring cycles before someone picks up or they give up.

**26.7% of queue calls are lost** (missed + VM). Callers who don't get through wait an average of 1 min 41 sec before abandoning.

---

## 5. Voicemail Analysis

| Metric | Value |
|--------|-------|
| Total voicemails | 52 |
| Returned (called back) | 18 (34.6%) |
| NOT returned | 34 (65.4%) |

**Voicemails by line:**

| Line | VMs | Returned |
|------|----:|---------|
| Main Line (972-369-4220) | 29 | ~10 |
| Sherman Line (903-892-0751) | 9 | ~3 |
| Exult Line 2 (469-714-0006) | 5 | ~2 |
| Dallas Direct (214-585-4545) | 3 | 0 |
| Direct 4340 | 2 | 0 |
| Direct 4282 | 2 | ~1 |

**65% of voicemails are never returned.** This is the biggest service gap. Patients leaving voicemails on the main line expect a callback.

---

## 6. Missed Calls -- No Callback, Never Reached Us (NEEDS FOLLOW-UP)

These 38 callers were missed, never called back, and never successfully reached the office during the analysis window. This is the highest-priority list for same-day callbacks.

| Date/Time (CT) | From Number | Location | Line Called |
|-----------------|-------------|----------|-------------|
| Apr 6 09:21 | (903) 421-1463 | Sherman, TX | Sherman Line |
| Apr 6 09:45 | (855) 216-9420 | -- | Main Line |
| Apr 6 10:29 | (469) 370-1700 | McKinney, TX | Exult Line 2 |
| Apr 6 10:48 | (469) 389-4067 | Frisco, TX | Dallas Direct |
| Apr 6 14:54 | (209) 926-8083 | Stockton, CA | Dallas Direct |
| Apr 7 02:55 | (903) 814-5887 | Sherman, TX | Direct 4282 |
| Apr 7 11:17 | (817) 609-4484 | Weatherford, TX | Dallas Direct |
| Apr 7 11:34 | (214) 660-1754 | Dallas, TX | Dallas Direct |
| Apr 7 11:57 | (945) 293-1189 | Dallas, TX | Dallas Direct |
| Apr 7 12:58 | (805) 598-2178 | Santa Maria, CA | Main Line |
| Apr 7 16:22 | (214) 901-0332 | McKinney, TX | Direct 4282 |
| Apr 7 16:51 | (214) 698-0603 | Dallas, TX | Dallas Direct |
| Apr 8 09:35 | (929) 256-1455 | New York City, NY | Sherman Line |
| Apr 8 10:08 | (708) 297-0354 | Blue Island, IL | Dallas Direct |
| Apr 8 10:19 | (504) 203-6660 | New Orleans, LA | Direct 4282 |
| Apr 8 10:27 | (213) 737-6045 | Los Angeles, CA | Direct 4315 |
| Apr 8 10:31 | (267) 347-7845 | Quakertown, PA | Direct 4315 |
| Apr 8 10:32 | (615) 719-9409 | Nashville, TN | Direct 4254 |
| Apr 8 10:35 | (213) 737-5146 | Los Angeles, CA | Direct 4254 |
| Apr 8 10:38 | (980) 410-0617 | Albemarle, NC | Direct 4282 |
| Apr 8 12:23 | (972) 562-4401 | McKinney, TX | Main Line |
| Apr 8 12:51 | (813) 288-8080 | Tampa, FL | Direct 4355 |
| Apr 9 08:56 | (626) 770-6542 | Alhambra, CA | Exult Line 2 |
| Apr 9 11:39 | (469) 485-8415 | Farmersville, TX | Dallas Direct |
| Apr 9 13:21 | (214) 901-5456 | McKinney, TX | Direct 4282 |
| Apr 9 14:02 | (469) 209-6969 | Plano, TX | Direct 4323 |
| Apr 9 14:07 | (469) 209-6969 | Plano, TX | Direct 4323 |
| Apr 10 10:22 | (469) 209-6969 | Plano, TX | Direct 4323 |
| Apr 10 12:00 | (800) 228-2881 | -- | Main Line |
| Apr 10 12:21 | (972) 239-4441 | Addison, TX | Main Line |
| Apr 10 16:07 | (972) 363-7754 | McKinney, TX | Main Line |
| Apr 12 08:06 | (903) 436-9629 | Sherman, TX | Exult Line 2 |
| Apr 12 08:06 | (903) 436-9629 | Sherman, TX | Exult Line 2 |
| Apr 12 13:00 | (202) 900-1726 | Washington, DC | Direct 0916 |
| Apr 12 16:57 | (214) 466-0465 | Dallas, TX | Main Line |
| Apr 12 16:57 | (214) 466-0465 | Dallas, TX | Main Line |
| Apr 12 16:57 | (214) 466-0465 | Dallas, TX | Main Line |

**NOTE:** (972) 363-7754 is Gautam's own number -- his call to main line on Apr 10 went to voicemail.

**Repeat offenders:**
- (469) 209-6969 from Plano called 3 times across 2 days to Direct 4323 and never got through
- (214) 466-0465 from Dallas called 3 times in 1 minute on Apr 12 -- all missed

---

## 7. Time-of-Day Analysis (Central Time)

| Hour (CT) | Inbound | Answered | Missed | VM | Miss Rate |
|-----------|--------:|---------:|-------:|---:|----------:|
| 8:00-8:59 | 15 | 5 | 4 | 4 | **53.3%** |
| 9:00-9:59 | 44 | 21 | 3 | 9 | 27.3% |
| 10:00-10:59 | 58 | 29 | 16 | 8 | **41.4%** |
| 11:00-11:59 | 39 | 25 | 7 | 5 | 30.8% |
| 12:00-12:59 | 47 | 31 | 5 | 10 | **31.9%** |
| 1:00-1:59 PM | 47 | 38 | 5 | 4 | 19.1% |
| 2:00-2:59 PM | 51 | 37 | 10 | 3 | 25.5% |
| 3:00-3:59 PM | 48 | 42 | 2 | 2 | **8.3%** |
| 4:00-4:59 PM | 35 | 24 | 6 | 5 | 31.4% |

**Peak problem hours:**
- **8:00-8:59 AM: 53% miss rate** -- office is opening, staff not yet at phones
- **10:00-10:59 AM: 41% miss rate** -- highest volume hour, staff overwhelmed
- **12:00-12:59 PM: 32% miss rate** -- likely lunch hour coverage gap

**Best hour:** 3:00-3:59 PM at 8.3% miss rate (48 calls, 42 answered).

---

## 8. Spam/Robocall Summary

| Type | Count |
|------|------:|
| Blocked | 11 |
| Rejected | 7 |
| Wrong Number | 3 |
| **Total spam-like** | **21** |

Extensions tagged "SUSPECTED ROBOCALL" received 28 inbound calls, 14 answered. These extensions may be receiving legitimate calls misrouted, or they may be attracting spam.

---

## 9. IVR Flow Analysis

**Current flow:** Main Line -> IVR (Ext 2000) -> Queue (Ext 55, rotating mode) -> Ring group (Front Office 4, Dani, Front Office 2, Laura Leyva, MDPA 1 Sherman)

**Routing patterns observed:**
- 275 calls (68% of inbound) go through multi-leg routing (IVR -> queue -> ring group)
- Queue rings 5 extensions in rotating order
- Front Office 4 gets the most ring attempts (250) but answers very few -- it appears to be a phantom/unattended extension
- Dani Jackson ultimately handles most calls that get through

**Problems with current IVR:**
1. **Rotating mode creates serial delays.** Each extension rings for ~15 sec before rotating. With 5 extensions, a caller could wait 75 sec before all are tried.
2. **Dead extensions in rotation.** Front Office 4 gets 250 ring attempts but is labeled for outbound use. It wastes 15 sec of caller wait time per rotation.
3. **No after-hours greeting/routing.** Weekend and evening calls just ring and miss.
4. **Prescription and Medical Records lines go to VM.** No staff is assigned to answer these.

---

## 10. Recommendations for Phone Tree / IVR Improvements

### IMMEDIATE (do this week)

**R1. Switch queue from Rotating to Simultaneous ring mode.**
Ring all available extensions at once. This alone could cut miss rate by 30-50%. Callers get answered by whoever is free first instead of waiting through serial ring cycles.

**R2. Remove Front Office 4 from the inbound ring group.**
It takes zero inbound calls despite being rung 250 times. Remove it from queue ext 55 to stop wasting 15 sec per rotation.

**R3. Fix or decommission Dallas Direct (214-585-4545).**
100% miss rate on 9 calls. Either assign it to a live extension or forward to the main queue.

**R4. Fix Direct 4323.**
100% miss rate. 3 calls from the same Plano number across 2 days -- likely a patient trying to reach a specific provider.

### SHORT-TERM (next 2 weeks)

**R5. Add after-hours auto-attendant.**
Currently, calls after 5 PM CT just ring out. Set an after-hours greeting: "You've reached Exult Healthcare. Our office hours are Mon-Fri 8am-5pm. For emergencies, press 1. To leave a voicemail, press 2."

**R6. Add opening-hours coverage for 8-9 AM.**
53% miss rate in the first hour. Either shift Dani's start time earlier, or route 8-9 AM calls to voicemail with a greeting: "We open at 9 AM. Leave a message and we'll call you back within 30 minutes."

**R7. Implement a voicemail callback queue.**
Only 35% of voicemails get returned. Create a daily task: pull all VMs from prior day, assign to staff for callback by noon. The RC API can surface these automatically.

**R8. Merge Prescription and Medical Records into the main queue with IVR options.**
These dedicated lines are going 100% to voicemail. Add IVR options: "Press 3 for prescription refills, press 4 for medical records" -- but route them to the same front desk queue with a tag so staff knows the context.

### MEDIUM-TERM (next month)

**R9. Deploy a callback widget.**
For calls that wait >60 sec in queue, offer: "Press 1 and we'll call you back when an agent is available." RC has APIs for this.

**R10. Add a lunch-hour rotation.**
12-1 PM has a 32% miss rate. Stagger lunches so at least one front desk person is always on the phones.

**R11. Build an automated missed-call callback report.**
Use the RC API to generate a daily list of missed calls not yet returned (like section 6 of this report) and push it to Dani or Gautam every morning. This agent can automate this.

**R12. Investigate 214-585-4545 and other direct-dial numbers.**
Multiple direct-dial numbers (469-436-xxxx series) receive calls but have high miss rates. These may be provider direct lines that ring to empty desks. Either forward them to queue or publish only the main number.

---

## Appendix: Phone Number Directory

| Number | Identified As | Inbound | Miss Rate |
|--------|---------------|--------:|----------:|
| (972) 369-4220 | Main Line | 163 | 28.8% |
| (469) 714-0006 | Exult Line 2 | 103 | 15.5% |
| (903) 892-0751 | Sherman Line | 52 | 23.1% |
| (469) 436-4282 | Direct 4282 | 22 | 36.4% |
| (903) 892-9694 | Sherman Line 2 | 11 | 9.1% |
| (214) 585-4545 | Dallas Direct (DEAD) | 9 | 100% |
| (903) 487-0916 | Direct 0916 | 9 | 11.1% |
| (469) 436-4323 | Direct 4323 (DEAD) | 3 | 100% |

## Appendix: Outbound Call Leaders

| Staff | Outbound Calls |
|-------|---------------:|
| Dani Jackson | 84 |
| Front Office 2 | 52 |
| Front Office 4 | 36 |
| Laura Leyva | 27 |
| Shaye Lemieux | 4 |
| Jerritt Todd | 2 |
| Skye Toles | 2 |

---

*Report generated from RingCentral Call Log API. Data covers 611 call records from April 5-12, 2026. All times converted to Central Time (CDT, UTC-5).*
