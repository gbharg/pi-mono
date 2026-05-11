# Exult Linear — Prioritized Execution Plan (2026-04-10)

Scanned 56 issues in Linear team `Exult`. Ranked by highest leverage on **cost down / revenue up**. Tier 1 = execute this week.

---

## TIER 1 — Highest $ leverage, start now

### 1. EXU-46 / EXU-47 — Enable Medicare + Railroad Medicare in AdvancedMD  [REVENUE — very high]
**Why it's #1:** A psychiatry practice that is not enrolled in Medicare is leaving serious money on the table. In McKinney, TX the over-65 demographic is sizable and Medicare psychiatric visits bill at ~$130 each. Even a conservative 10-15 new Medicare patients/week ≈ $75k–$100k/yr of incremental revenue.

**What it actually takes:**
1. PECOS provider enrollment for each billing provider (Dr. B, any NPs) — 60-90 day wait
2. Railroad Medicare (Palmetto GBA) separate enrollment — similar timeline
3. EDI enrollment with both payers (855I + EDI forms) so electronic claims flow through AMD
4. AMD payer setup: add Medicare / RRB as carriers, attach to providers, map fee schedule
5. Test claim submission end-to-end

**Blocker:** I don't have PECOS credentials and I can't sign the 855I. Human action required to kick this off — Dr. B needs to initiate in PECOS.

**Proposed agent role:** Generate the enrollment paperwork, pre-fill 855I from AMD provider data, track status weekly, configure AMD carrier setup once approved.

**My execution plan:**
- [ ] Draft an enrollment-status email to CMS/Palmetto to verify current state (maybe Dr. B is already enrolled under ARC and it just needs re-association)
- [ ] Pull providers + NPIs from AMD, generate pre-filled 855I PDFs for each
- [ ] Confirm whether AMD has a "Medicare enrollment" workflow in AMD Central or if it's manual
- [ ] Create a weekly tracker of enrollment status
- [ ] Close one of EXU-46/47 as duplicate (they have identical titles)

---

### 2. EXU-10 — RC line/seat cleanup  [COST — in progress]
**Why:** Already underway as part of the 30→15 license ask I drafted to Shane Lurido. Completing the Tier 3 deletion list gets us to 15 seats.

**Current savings estimate:** 15 fewer RingEX Standard seats × ~$25/mo = **$375/mo = $4,500/yr**. Plus any add-ons attached to those seats.

**My execution plan (blocked only on Gautam per-line OK):**
- [ ] Walk Gautam through the 12 remaining Tier 3 candidates (101 Bianca, 105 MDPA 5, 111 Sherman 1, 114 Sherman 4, 141 April NP, 161 MA C11, 204 Raj 2nd, 241 IOP 1, 242 IOP 2, 245 IOP 5, 402 Teegan, 985 Exult Office) one at a time: keep/cut
- [ ] Delete approved extensions via RC API
- [ ] After Shane confirms license reduction, recount seats in service-info

---

### 3. EXU-25 — Mystery "title management" charge  [COST — quick hit]
**Why:** Any unexplained recurring charge is either a dead service ($$ leaking) or an underused one that should be renegotiated. Typical range for mystery SaaS charges: $50-$500/mo.

**My execution plan:**
- [ ] Grep bank/card statements (accessible via Gautam's email — vendor invoices are there) for "title management"
- [ ] Identify vendor, login, purpose
- [ ] Recommend cancel vs. keep with expected savings number
- [ ] If unused, cancel the same day

---

### 4. EXU-24 — Duplicate copay / practice fee review  [REVENUE + patient UX]
**Why:** Duplicate billing = refund requests = write-offs = patient friction. Clean this up and the bottom line gets a one-time bump plus fewer disputes. I have full AMD API read access.

**My execution plan:**
- [ ] Query AMD charges by patient for last 90 days where copay code appears >1x in a single visit
- [ ] Query all practice fees (e.g., $175 follow-up, $375 new patient) and look for dups
- [ ] Produce a report: patient chart#, visit date, charge IDs, dup amount, refund-owed amount
- [ ] Gautam approves per-patient write-offs or refunds
- [ ] Fix root cause (AMD charge rule that's mis-posting)

---

### 5. EXU-40 — AWS Activate credits (≥$1,000)  [COST — low effort]
**Why:** Direct credit. 30 min of work. Already wrote Q1 usage data to the AgentCore infra.

**My execution plan:**
- [ ] Apply at aws.amazon.com/activate — I can drive Playwright through the form
- [ ] Mention Exult Healthcare + AgentCore + HIPAA agent as the use case
- [ ] Confirm credit posted; check Billing > Credits for the existing $100 signup credit

---

### 6. EXU-7 — Fix phone routing (ring group rotating with dead extensions)  [REVENUE — indirect but high]
**Why:** 60+ second answer delays on the main line = abandoned calls = lost new patients + no-show reschedule failures. At $175/follow-up and $375/new patient, even 2-3 lost appointments per week = $15k-$40k/yr in foregone revenue.

**My execution plan (I can do this entirely via RC API today):**
- [ ] Map the current ring group members in Front Office queue 55 + any other main-line queues
- [ ] Remove extensions that are disabled or belong to departed staff
- [ ] Switch from rotating to simultaneous or fixed order so the phone rings real people immediately
- [ ] Test-call the main number and verify answer time <5s
- [ ] Document the final config in the provisioning audit

---

### 7. EXU-26 — Appointment reminder frequency  [REVENUE — very high]
**Why:** No-show reduction is the single biggest ROI lever in an outpatient practice. If current no-show rate is 10% and a better reminder cadence drops it to 7%, on ~50 visits/day × $175 = **~$43k/yr recovered**.

**My execution plan:**
- [ ] Pull 30-day no-show data from AMD (getappointments filter status=no-show)
- [ ] Query current AMD reminder settings (getpatientpreferences + reminder profile)
- [ ] Propose schedule: SMS 7 days out + email 3 days out + SMS 24 hrs out + SMS 2 hrs out
- [ ] Configure in AMD reminder profile
- [ ] A/B measure no-show rate over next 4 weeks

---

## TIER 2 — High revenue/efficiency, start after Tier 1

### 8. EXU-49 — Map revenue + charge codes in AdvancedMD
Ensure every procedure code has the correct fee schedule. Wrong CPT mapping = underbilling.

### 9. EXU-48 — Update referral NPIs
Bad referral NPIs = rejected Medicare/Medicaid claims. Needs a one-pass cleanup.

### 10. EXU-50 — Institutional billing claim needs
Investigate whether Exult can bill institutional (UB-04) claims for partial hospitalization / IOP. IOP lines exist in RC (ext 241/242/245). If IOP program is real, institutional billing could unlock significant new revenue.

### 11. EXU-23 — 03/31 audit, 103 charge review
Specific charge-code audit from a prior review. Close out whatever discrepancy this references.

### 12. EXU-51 — Document template reviews in AMD
Blocks claims because missing signatures / reviews = claims holding. Unblock.

### 13. EXU-55 — Copay collection timing decision
Time-of-service vs. bill-after. Time-of-service always wins on collections rate (90%+ vs. 50% for mailed). Recommend time-of-service + have AMD auto-copay workflow set up.

### 14. EXU-56 — Website form to Shaye
New-patient intake automation. Convert web traffic to scheduled visits.

---

## TIER 3 — Efficiency, do after Tier 1+2

15. EXU-20 Automate schedule posting — save 1-2hr/wk front desk
16. EXU-21 Automate quick charts for week — save provider time
17. EXU-19 Review payroll system — save 1hr/week
18. EXU-11 Update Duplex / eFax access
19. EXU-13 Remove prior / inactive users
20. EXU-22 Front-office quick fact sheet
21. EXU-16 Update Record SOP (Friday-only)
22. EXU-17 Document practice collection process
23. EXU-18 Document insurance verification process
24. EXU-8 Update phone tree / voicemail
25. EXU-9 Update phone log

---

## TIER 4 — HR & hiring (depends on staffing plan)

26. EXU-14 Open front-office job application
27. EXU-15 Review virtual front-office resumes

---

## TIER 5 — Compliance & infrastructure (long-term, important but not $ leverage)

28. EXU-35 Sign RingCentral BAA — **already done 2026-04-07, close it**
29. EXU-38 Verify AdvancedMD BAA — grep existing contract files
30. EXU-36 Upgrade Twilio to HIPAA Security Edition — only matters once Twilio SMS is live
31. EXU-39 Scope down IAM admin + break-glass — standard security hygiene
32. EXU-41 Evaluate managed AWS services vs self-hosted — already partially done (Wave 5/6)
33. EXU-43 Wave 6 AgentCore runtime deploying (in progress)
34. EXU-37 Microsoft M365 BAA PDF — **already done**, close it
35. EXU-27 Contact Arc about SharePoint
36. EXU-52 Teams messaging
37. EXU-53 Teams video conferencing
38. EXU-54 AI meeting recording + transcript analysis

---

## Summary: what I can start **today** without further approval

- **EXU-40** (AWS Activate credits) — drive Playwright
- **EXU-25** (title management mystery charge) — email grep + vendor hunt
- **EXU-7** (phone routing fix) — RC API config changes
- **EXU-24** (duplicate copay audit) — AMD API read-only, produce report
- **EXU-26** (no-show reduction) — pull AMD data, draft new reminder schedule

These 5 are the highest $-per-effort items. Blocked on Gautam per-line OK for EXU-10 (RC seat deletion), and blocked on Dr. B for EXU-46/47 (Medicare enrollment).

## What needs Gautam to unblock

1. EXU-10 — 12 per-extension keep/cut decisions
2. EXU-46/47 — Authorize Dr. B / NPs to start PECOS enrollment
3. EXU-55 — Copay timing decision (time-of-service or bill-after)
4. EXU-50 — Is Exult actually running an IOP program? (required before investigating institutional billing)
