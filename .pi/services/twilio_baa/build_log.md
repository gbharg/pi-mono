# Twilio BAA Request — Build Log

**Service:** Twilio (Programmable Messaging, Programmable Voice, Verify, Lookup)
**Customer:** Exult Healthcare PLLC
**Requested by:** Gautam Bhargava, COO (iMessage, 2026-04-11)
**Executed by:** Claude Code agent (claude-opus-4-6), 2026-04-11
**Status:** PARTIALLY COMPLETED — draft email staged, Gautam action required to send. See "What Gautam needs to do" at the bottom.

---

## TL;DR

1. A Twilio account **already exists** on `gautam@exulthealthcare.com` (created 2026-04-04, free trial / Build tier, profile incomplete, toll-free number purchased and pending verification). No new account was created — that would have created a duplicate.
2. Twilio's 2026 BAA flow is **sales-led, not self-service**. There is no public BAA request form. The published process is: contact Twilio sales → Twilio issues the Business Associate Addendum → customer must be on **Security Edition or Enterprise Edition** (not the default Build tier) for the BAA to be signable.
3. An outbound email draft has been prepared in Gautam's Outlook Drafts folder addressed to the Twilio onboarding team (with CC to `privacy@twilio.com` and `legal@exulthealthcare.com`) explicitly requesting the BAA and laying out the business case. **Gautam needs to open the draft, review, and click Send.**
4. Until the BAA is executed, **no PHI may be sent through the existing Twilio account**. The toll-free verification currently in flight should be paused or limited to non-PHI test traffic.

---

## Step 1 — Research: Twilio's current (2026) BAA flow

### Authoritative sources checked

| Source | URL | What it told us |
|---|---|---|
| Twilio HIPAA overview | https://www.twilio.com/en-us/hipaa | BAA requires **Security Edition or Enterprise Edition**. Process: "contact your Twilio Account Representative or Contact Sales." |
| Understanding Twilio's BAA (blog) | https://www.twilio.com/en-us/blog/understanding-twilio-baa | Confirms sales-led flow. Customer must identify which projects/subaccounts will process PHI. |
| HIPAA Eligible Services PDF | https://www.twilio.com/content/dam/twilio-com/global/en/other/hipaa/pdf/HIPAA-Eligible-Services.pdf | Last updated Sept 30, 2025 (current as of 2026-04-11). Full list of covered products — see next table. |
| Twilio Editions | https://www.twilio.com/en-us/editions | As of 2026 there are 3 editions: Administration, Security, Enterprise. The "HIPAA Accounts" feature is listed under Enterprise Edition. |
| Talk to Sales form | https://www.twilio.com/en-us/help/sales | Marketo form (`mktoForm_4078`). Fields: First Name, Last Name, Job Title, Business Email, Phone Number, Country, Primary Product Interest. **No free-text use-case or HIPAA field.** "Free trial — no credit card required." |
| Privacy Notice | https://www.twilio.com/en-us/legal/privacy | Canonical contact for data-protection matters: `privacy@twilio.com` (DPO). |

### HIPAA-eligible products (from the Sept 30, 2025 PDF)

Every product Gautam plans to use is on the list:

- **Programmable SMS** — basics, MMS, toll-free, long codes, short codes, Messaging Services (advanced opt-out, fallback, link shortening, message scheduling, sticky sender, geomatch).
- **Programmable Voice and SIP** — basics, Call Recordings & Storage, Call Transcription, `<Transcription>`, Speech Recognition, Text-to-Speech, Answering Machine Detection, Voice Insights, Media Streams, IVR, Agent Conference, Outbound Conference API, Conversational Intelligence for Voice.
- **Identity Services** — Verify (SMS/Voice/Push), Lookup.
- **Runtime Tools** — Studio, Functions, Debugger, Sync, Assets, TwiML Bin.
- **Twilio Conversations** — Chat, SMS, MMS, Group Texting, media support, opt-out.

Footnotes on the PDF note that several starred items (Studio, Call Recordings, Call Transcription, Media Streams, Conversational Intelligence, etc.) require following the "Architecting for HIPAA on Twilio" guidelines for proper use. That's an implementation-time concern, not a BAA-time concern.

### Edition / tier requirement

> "Customers wishing to sign a BAA with Twilio must have our Security Edition or Enterprise Edition." — twilio.com/en-us/hipaa

The Build tier (default free trial) **cannot** sign a BAA. Upgrading to Security or Enterprise Edition is not self-service from the console — it is handled through a Twilio Account Executive as part of the BAA conversation.

Older third-party sources (2024-2025) mention an ~$15,000/month minimum for Enterprise Edition, but Twilio's own pricing pages do not publish a number for 2026. This is a blocker Gautam will need to negotiate. If the $15K/month minimum still applies at Enterprise level, Exult's 3,000 msgs/month volume (~$24-50/month of actual SMS spend) is vastly below that floor, and Security Edition may be the only viable tier — or a smaller practice-friendly option will have to be negotiated.

---

## Step 2 — Check existing Twilio account state (Outlook inbox search)

Microsoft Graph search of `gautam@exulthealthcare.com` mailbox using the existing app-only credentials at `/Users/agent/pi-mono/.config/exult/microsoft365.json` (Mail.Read scope verified).

Query: `$search="twilio"` against `/users/gautam@exulthealthcare.com/messages`

Total matches: **2 emails** from any Twilio domain.

| Date (UTC) | From | Subject | Meaning |
|---|---|---|---|
| 2026-04-04 07:11 | no-reply@twilio.com | "Verify your Email" | Initial signup email verification code. Confirms the account was created on this date. |
| 2026-04-08 14:06 | teamtwilio@team.twilio.com (Isa Bell, "Onboarding Success Manager") | "Quick heads-up: Verify your toll-free number to start messaging" | Automated onboarding nudge. Greeting "Hi Unknown" — means the First Name profile field on the Twilio account has not been filled in, confirming the account setup is still incomplete. |

No other emails, no welcome packet with Account SID, no assigned named Account Executive, no API keys, no billing receipt. Nothing in the central admin credential vault (`/Users/agent/.config/exult/admin-credentials.json`) mentions Twilio either.

**Conclusion:** Account exists but is an unconfigured free trial. Gautam signed up, got the toll-free number, and stopped before verification. No BAA, no paid edition, no production traffic. This is exactly the moment to put the BAA in motion **before** any PHI ever touches the account.

---

## Step 3 — Account provisioning (SKIPPED)

Originally the task allowed me to create a Twilio account if none existed. Since one already exists on the target email, creating a second would have caused a duplicate-account problem and is not what Gautam wants.

**No Playwright signup was executed.** The existing trial can be used as-is; the upgrade path is through the BAA conversation with sales.

---

## Step 4 — BAA request (DRAFT STAGED, not sent)

### Why not auto-submit the Contact Sales form

I opened `https://www.twilio.com/en-us/help/sales` with Playwright and captured the form schema:

- Fields: First Name, Last Name, Job Title, Business Email, Phone Number, Country, Primary Product Interest (dropdown).
- Dropdown options include "Messaging APIs (SMS, RCS & WhatsApp)" and "Voice & Video APIs" — but **no free-text box for use case, compliance, or HIPAA/BAA**.
- Submitting the form commits Gautam to the "I agree to receive marketing emails" consent flag.

Because the form has no field to state "I need a BAA", submitting it alone would just put Gautam in the generic sales funnel without communicating the actual ask, and the first reply from a sales rep would say "thanks, what are you looking to do?" — wasting a round trip. A direct email carrying all the BAA details in the body is strictly more efficient.

### Draft email created in Gautam's Outlook

Created via Microsoft Graph `POST /users/gautam@exulthealthcare.com/messages` as a draft message (not sent).

- **From:** gautam@exulthealthcare.com (will be set on send)
- **To:** teamtwilio@team.twilio.com (the onboarding queue already engaged with Gautam — warmest routing path)
- **Cc:** privacy@twilio.com (Twilio's DPO — creates an independent HIPAA paper trail) and legal@exulthealthcare.com (Exult's own legal archive address)
- **Subject:** `BAA request for Exult Healthcare PLLC (Twilio account on gautam@exulthealthcare.com)`
- **Importance:** High
- **Outlook draft id:** `AAMkAGY5MDg1ZjQwLWExZWEtNDI1YS04NmY2LTkwNzM3NjdlOGEyZgBGAAAAAADDF3Ctho8gT7mHJqJzU9KoBwDLdRnfNkLBTqXLLy8yIaKWAAAAAAEPAADLdRnfNkLBTqXLLy8yIaKWAAAT3LH4AAA=`
- **Open in OWA:** https://outlook.office365.com/mail/drafts (the most recent draft in Gautam's Drafts folder)

The email body asks Twilio to either route to the HIPAA/legal team or introduce an AE. It includes:

- Exult legal name, practice type, McKinney TX, Covered Entity status.
- Existing Twilio account email and state (created 4/4, trial, toll-free pending verification, no production traffic).
- Exact product list Gautam wants covered (SMS, Voice, Verify, Lookup).
- Volume estimate (~3,000 SMS/month, ~500 patients, inbound <1,000/month, low voice volume).
- Note that the BAA should cover the single default production project plus any AdvancedMD subaccount created later.
- Primary signatory (Gautam), legal CC (legal@exulthealthcare.com), billing entity (Exult Healthcare PLLC).
- Three specific questions: (1) next step to receive/sign the BAA, (2) whether Security Edition is self-service or sales-contract, (3) expected timing.

### Why this approach is safe

- **No credit card entered.** The draft does not commit Exult to any spend.
- **No account changes made.** I did not log into the Twilio console, did not purchase numbers, did not change any setting, did not create API keys.
- **No PHI in the email.** The draft contains only volume estimates and the company description. Zero patient data.
- **Gautam is in control.** The email is a draft in his own mailbox; nothing is sent until he clicks Send.

---

## Step 5 — Documentation & commit

This build_log is committed to git. The Microsoft 365 config and admin credentials remain outside git (already excluded) and no secrets appear in this file.

### Artifacts in this directory

```
/Users/agent/pi-mono/.pi/services/twilio_baa/
├── build_log.md                        # this file
└── hipaa_eligible_services_2025-09-30.pdf   # authoritative Twilio HIPAA-eligible product list, cached 2026-04-11
```

---

## What Gautam needs to do

### Immediate (today)

1. **Open the Outlook draft.** Go to https://outlook.office365.com/mail/drafts — the draft `BAA request for Exult Healthcare PLLC (Twilio account on gautam@exulthealthcare.com)` is at the top.
2. **Review the email body** — particularly the volume estimate (3,000 SMS/month, 500 patients) and the signatory block. Adjust if any number is wrong.
3. **Confirm CC list.** Default is `privacy@twilio.com` and `legal@exulthealthcare.com`. Remove either if not wanted.
4. **Click Send.** (Or reply from your phone — the draft is mailbox-wide, not device-specific.)

### Short-term (this week)

5. **Pause the toll-free number verification** OR confirm with yourself that no PHI will flow through the account until the BAA is executed. Twilio explicitly prohibits PHI on the HIPAA-eligible products without an executed BAA. (The toll-free verification process itself is fine — that's just registering the number with carriers, no PHI involved.)
6. **Fill in the Twilio console profile.** The "Hi Unknown" greeting in the Apr 8 email means your First Name field is blank. Log into https://console.twilio.com → Settings → General → set First Name / Last Name / Company = Exult Healthcare PLLC. This makes it easier for an AE to match your inbound sales inquiry to the existing trial account.
7. **Watch for a reply from Twilio.** Expected within 1 business day per their Contact Sales page. Reply will most likely come from either a named AE or `privacy@twilio.com` with a DocuSign BAA link. If no reply within 2 business days, also submit the Contact Sales form at https://www.twilio.com/en-us/help/sales using `Voice & Video APIs` as the primary product interest.

### Negotiation checklist (when the AE calls)

8. **Ask which edition is the floor for a BAA** in Exult's scale band (a ~$50/mo SMS practice). Push back on Enterprise Edition if it's a $15K/mo minimum — ask whether Security Edition or a small-practice BAA package is available. Twilio has historically offered HIPAA to smaller customers on Security Edition without Enterprise spend commits, but this has tightened; get the current answer in writing.
9. **Ask about the HIPAA Accounts feature** specifically — Twilio's Enterprise Edition page advertises it as the mechanism to segregate HIPAA from non-HIPAA traffic in the same organization. Confirm whether it is required for your single-project use.
10. **Ask if the BAA covers all listed products** (SMS, Voice, Verify, Lookup) under one agreement, or whether separate BAAs per product are needed.
11. **Before signing:** forward the BAA PDF to `legal@exulthealthcare.com` and keep an archive at `/Users/agent/pi-mono/.pi/services/twilio_baa/signed_baa.pdf` once executed. Do **not** commit signed PHI contracts to git — keep them out of the repo.

### If Twilio refuses or the minimum spend is prohibitive

12. **Fallback option: keep RingCentral for SMS.** RingCentral RingEX Standard already includes SMS per line and RingCentral also signs BAAs. If Twilio's BAA minimums are unworkable for a 15-seat practice, the cheapest path is to use RingCentral's native SMS for reminders via the `sendSms` API we already have configured in the Keragon integration. Twilio would only come into play if you need a richer SMS platform (templating, opt-in handling, etc.) that RingCentral doesn't offer.
13. **Second-fallback: use a HIPAA-native SMS reminder vendor.** Options to evaluate: Spruce Health, Luma Health, Klara, Relatient, Updox. All ship with a BAA out of the box and are priced per-seat or per-patient in the $100-400/month range — much more favorable than Enterprise Twilio for a 15-seat practice.

---

## References

- Twilio HIPAA page: https://www.twilio.com/en-us/hipaa
- Twilio BAA blog: https://www.twilio.com/en-us/blog/understanding-twilio-baa
- Twilio Editions: https://www.twilio.com/en-us/editions
- Twilio Contact Sales form: https://www.twilio.com/en-us/help/sales
- HIPAA Eligible Services PDF (Sept 30, 2025): https://www.twilio.com/content/dam/twilio-com/global/en/other/hipaa/pdf/HIPAA-Eligible-Services.pdf
- Twilio Privacy Notice (DPO contact): https://www.twilio.com/en-us/legal/privacy
- Architecting for HIPAA on Twilio: https://help.twilio.com/articles/360059959413-Building-HIPAA-Compliant-Messaging-Applications-with-Twilio

---

## Change log

- 2026-04-11 — Initial build_log created. Research completed, Outlook draft staged, no secrets entered, no production changes made. Awaiting Gautam review-and-send.
