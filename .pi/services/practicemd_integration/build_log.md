# PracticeMD Integration — Build Log

**Date:** 2026-04-11
**Agent:** Claude Opus 4.6
**Scope:** Inventory only. Read-only. Mailbox searches across multiple Exult mailboxes.

## Summary

**PracticeMD does not exist as an Exult Healthcare account.** There is zero evidence of any product literally named "PracticeMD" in any searched mailbox, and no billing, welcome, or vendor correspondence tied to such a product. The ask is most likely a naming-confusion with one of three other entities — recommend confirming with Gautam before any further action.

## Inbox Evidence

### Search terms used

Tried on `gautam@exulthealthcare.com`, `exult-info@exulthealthcare.com`, `billing@exulthealthcare.com`, `doctorb@exulthealthcare.com`, `fax@exulthealthcare.com` (where accessible):

| Term | Query Type | Total Hits |
|---|---|---|
| `practicemd` | Graph `$search` | 0 |
| `practice md` | Graph `$search` (matches "practice" + "md" separately) | ~21 (all unrelated — medical-records threads, Curogram proposal, RingCentral BAA thread) |
| `practice-md` | Graph `$search` | 0 |
| `practicemd.com` | Graph `$search` | 0 |
| `practicemd.net` | Graph `$search` | 0 |
| `practicemd.io` | Graph `$search` | 0 |
| `pmd` | Graph `$search` | 2 incidental hits (unrelated: VA authorization, Psychology Today newsletter) |
| `contains(from/emailAddress/address, 'practicemd')` | Graph `$filter` | 0 across all mailboxes |

**No direct hits for any PracticeMD vendor email address or branded subject line.**

### Adjacent / confusable hits (NOT PracticeMD)

| Subject | Sender | Date | Reality check |
|---|---|---|---|
| "My Top 3 Highlights of the August 2021 BHEC Council Meeting" | admin@practicementors.us | 2021-08-31 | **PracticeMentors** — a counselor business-coaching newsletter. Not a PM system. Rebranded to usmhp.org. |
| "Raj, things are heating up. Again." | admin@usmhp.org | 2026-03-18 | Same newsletter, new domain. |
| "Re: Curogram Proposal" | michelle.carcel@curogram.com | 2026-04-10 | **Curogram** — patient messaging vendor pitch, in active negotiation. Not PracticeMD. |
| "Re: Request for Business Associate Agreement (BAA) - Account 2761864020" | hipaa@ringcentral.com | 2026-04-10 | **RingCentral** HIPAA thread. Account 2761864020 is RC, not a PM system. |
| "[Various medical-records subject lines mentioning 'practice' and 'MD']" | skye.toles@, doctorb@ | various | Staff correspondence about records — incidental text match. |

## Most likely interpretations

Gautam said "PracticeMD (an online patient/practice-management tool — clarify exactly which product, there are several with similar names)". Ranked by likelihood:

1. **AdvancedMD (AMD)** — this IS the actual practice-management system Exult runs on. Office 161112. Already configured: `/Users/agent/pi-mono/.config/exult/amd_api_service.json`, reference `reference_amd_api.md`, integration live. People casually shorten "AdvancedMD" to "AMD" or "the MD system"; "PracticeMD" could be a verbal conflation.
2. **PracticeMentors** (now usmhp.org) — coaching newsletter only. Not a tool.
3. **A net-new product Gautam considered but never signed up for** — no trace in any mailbox, no billing record, no welcome email. If it exists, it pre-dates the Exult M365 tenant or lives in a personal inbox we do not have access to (e.g. gautambharg@gmail.com).

## Account Status

- **Account exists in Exult M365 tenant:** **NO**
- **Credentials found:** **NONE**
- **API tested:** **N/A — no service to test**

## Config file

- `/Users/agent/pi-mono/.config/exult/practicemd.json` — gitignored. Placeholder with investigation metadata. No credentials. File exists so downstream automation has a predictable path and the null state is explicit.

## Next Steps

1. **(Gautam — BLOCKING)** Clarify: is "PracticeMD" (a) a verbal shorthand for AdvancedMD, (b) a different product you signed up for personally outside the Exult M365 tenant, or (c) a product you were evaluating but never activated?
2. If (a): this task is done — AMD integration is already live; see `reference_amd_api.md`.
3. If (b): provide account email and vendor name. Can re-investigate in the target mailbox.
4. If (c): delete `practicemd.json` placeholder and close this work item.
5. **Do not** create a speculative integration scaffold for a product that does not exist. The repo currently has one placeholder config file and this build log; no code.

## References

- Mailbox search executed via Microsoft Graph `$search` and `$filter` queries, app-only auth through Exult Agent Service (`6725660a-f83a-4cb0-8892-14a223e0a701`).
- Cross-reference `/Users/agent/.claude/projects/-Users-agent-pi-mono/memory/reference_amd_api.md` — the real PM system in use.
