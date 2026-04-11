# MyFax Integration — Build Log

**Date:** 2026-04-11
**Agent:** Claude Opus 4.6
**Scope:** Inventory only. Read-only. No outbound faxes sent. No patient PHI copied into this file.

## Summary

MyFax is **ACTIVE** for Exult Healthcare and is the primary inbound fax channel for the clinic. The service is under the Consensus Cloud Solutions (formerly j2 Global) umbrella, product tier **MyFax consumer plan**. No programmatic API is exposed by the consumer tier as of 2026-04-11. The legacy SOAP endpoint (`ws.myfax.com/2010/01/sending.asmx`) is dead. A functional workaround exists via the Microsoft Graph API, which already has inbox access to `fax@exulthealthcare.com`.

## Inbox Evidence

### Mailbox: fax@exulthealthcare.com (primary, current delivery)

Sender `noreply@myfax.com` — 275+ messages in last ~6 days (search truncated at 500). Sample from `$search="myfax"` (metadata only, subjects/dates/no body):

| Received (UTC) | Subject | Has Attachment | Read |
|---|---|---|---|
| 2026-04-11 01:00:35 | MyFax message from "unknown" - 2 page(s) | yes | unread |
| 2026-04-11 00:42:27 | MyFax message from "8006374264" - 3 page(s) | yes | unread |
| 2026-04-10 22:21:48 | MyFax message from "19736713111" - 5 page(s) | yes | unread |
| 2026-04-10 21:33:55 | MyFax message from "NTX Fax 1 Server" - 37 page(s) | yes | unread |
| 2026-04-10 20:43:25 | MyFax message from "18667281379" - 1 page(s) | yes | unread |
| 2026-04-10 18:01:13 | MyFax message from "Walmart Pharmacy" - 2 page(s) | yes | read |
| 2026-04-10 18:01:11 | MyFax message from "Walmart Pharmacy" - 2 page(s) | yes | read |
| 2026-04-10 16:03:09 | MyFax message from "HCTXPAOUTPROD" - 1 page(s) | yes | read |
| 2026-04-10 14:51:49 | MyFax message from "Walmart Pharmacy" - 2 page(s) | yes | read |
| 2026-04-10 12:14:22 | MyFax message from "Cvs Specialty" - 1 page(s) | yes | read |
| 2026-04-10 05:42:52 | MyFax message from "CoverMyMeds Support" - 1 page(s) | yes | read |

Clinic staff (`skye.toles@exulthealthcare.com`) is working this mailbox and replying to individual faxes — confirming the workflow is alive.

### Mailbox: exult-info@exulthealthcare.com (historical delivery + account emails)

The account-level emails are in this mailbox, NOT in fax@:

| Received (UTC) | Subject | Sender |
|---|---|---|
| 2024-02-20 21:47:22 | Your email address has been changed | NoReply@MyFax.com |
| 2024-02-20 21:46:01 | Your email address has been changed | NoReply@MyFax.com |
| 2023-05-24 23:45:10 | Upcoming Changes to Your MyFax Subscription Fee | NoReply@MyFax.com |
| 2022-07-08 16:19:18 | Welcome to MyFax | NoReply@MyFax.com |
| 2022-01-21 17:19:39 | Welcome to MyFax | NoReply@MyFax.com |
| 2021-07-02 00:11:39 | MyFax Billing Statement | billing@myfax.com |
| 2021-06-02 22:11:44 | MyFax Courtesy Notice - Deepika Bhargava M.D PA | kaley.olsen@j2.com |
| 2021-06-01 00:11:09 | MyFax Billing Statement | billing@myfax.com |
| 2020-03-27 18:52:20 | Welcome to MyFax | NoReply@MyFax.com |

Key signals:
- Original account was registered under **Deepika Bhargava M.D PA** (predecessor entity).
- Account **was re-confirmed in 2024** via an email-address change (delivery routing moved from info@ to fax@ — matches the current state).
- A paid **annual** subscription is in place.

### Other mailboxes searched (no relevant hits)

`gautam@`, `billing@`, `admin@` — zero MyFax / j2 / Consensus / eFax account emails. Everything account-related is in `exult-info@`.

## Account Details (from 2022 Welcome email body, non-PHI)

- **Fax numbers provisioned:** +1 469 214 7801 (primary), +1 214 540 9470
- **Account email on file (2022):** info@exulthealthcare.com → changed 2024 → now routes to fax@exulthealthcare.com
- **Portal:** https://central.myfax.com/
- **Legacy portal:** https://secure.myfax.com/login.aspx
- **Plan (2022 values):** $66.00 annual / 1,000 inbound pages/month / 0 outbound included / $0.10 per extra page
- **Billing contact (2021):** kaley.olsen@j2.com
- **Support:** 1-866-378-2373 / support@myfax.com
- **Send-via-email pattern:** `E164NumberNoPlus@send.myfax.com` (e.g., `13231234567@send.myfax.com`)

Note: the 2022-07-08 welcome email body contained a temporary password. That password is 4+ years old and must be assumed rotated or invalid. Not reproduced here.

## API Status

### MyFax consumer plan: NO programmatic API

- Per MyFax FAQs and features pages (checked 2026-04-11), the consumer MyFax product exposes only three interfaces: **email-to-fax** (SMTP), **web portal** (central.myfax.com), and **mobile apps**.
- No REST API, no webhooks, no developer keys.

### Legacy SOAP endpoint: DEAD

```
GET https://ws.myfax.com/2010/01/sending.asmx
HTTP/2 400
Unable to process unknown request. Path: /2010/01/sending.asmx
```

The `ws.myfax.com/2010/01/sending.asmx` endpoint (documented historically as `SendSingleFax`) returns HTTP 400 on both plain GET and `?WSDL`. Retired by Consensus.

### Upgrade path for real API access

Consensus Cloud Solutions offers a RESTful fax API under the **eFax Corporate** / **eFax Developer** product line. This is a separate product from MyFax and requires:
- Sales engagement (1-866-378-2373 or https://www.efax.com/products/fax-api)
- New contract / upgrade from MyFax consumer tier
- HIPAA BAA (required for healthcare use — eFax Corporate has HITRUST CSF certification)
- Separate account credentials and API key provisioning
- Pricing quoted per customer (not published)

Gautam will need to decide whether to upgrade the existing MyFax account or stay on the current tier and use the Graph-based workaround below.

### Working interim "API" via Microsoft Graph

Because inbound faxes land in `fax@exulthealthcare.com` as normal email with PDF attachments, and the Exult Agent Service app already has Mail.Read on that mailbox, we can treat Graph as the de-facto ingestion API. **Sample call (executed 2026-04-11, response sanitized):**

**Request:**
```
GET https://graph.microsoft.com/v1.0/users/fax@exulthealthcare.com/messages
  ?$filter=from/emailAddress/address eq 'noreply@myfax.com'
          and receivedDateTime ge 2026-04-10T00:00:00Z
  &$count=true
  &$top=1
  &$select=id,subject,hasAttachments,receivedDateTime
Authorization: Bearer <app-only token>
ConsistencyLevel: eventual
```

**Response shape (sanitized, no PHI):**
```json
{
  "@odata.count": 23,
  "value": [
    {
      "id": "AAMkAD...REDACTED",
      "subject": " MyFax message from \"<sender-number>\" - N page(s)",
      "hasAttachments": true,
      "receivedDateTime": "2026-04-10T04:55:36Z"
    }
  ]
}
```

23 MyFax deliveries in the 24h window of the test. Attachment retrieval uses `GET /users/fax@exulthealthcare.com/messages/{id}/attachments` — PDFs stream directly.

**For outbound send:** can be done via Graph `sendMail` targeting `E164@send.myfax.com` from any licensed Exult mailbox, no MyFax API needed. This is currently the only programmatic send path available at the consumer tier. Gautam must explicitly approve before any outbound fax is sent (HIPAA / read-only posture).

## Config file

- `/Users/agent/pi-mono/.config/exult/myfax.json` — gitignored. Contains all account metadata, portal URLs, fax numbers, plan details. **Password field is explicitly unknown** — temp password is >4 years old, must be assumed rotated. If downstream agent needs portal access, trigger password reset via the support flow.

## Next Steps

1. **(Gautam)** Decide whether to upgrade to eFax Corporate/Developer for real API access, or stay on consumer + use Graph bridge. Cost/benefit depends on outbound volume.
2. **(Agent)** Wire the Graph-based inbound MyFax ingestion into a daily digest — pipe to AdvancedMD patient records where sender identifies a known patient.
3. **(Agent)** Confirm HIPAA BAA status with Consensus. MyFax consumer tier status re: BAA is unclear — 2022 welcome email does not mention one. Email support@myfax.com to request BAA documentation. (This parallels the RingCentral BAA request thread already in gautam@ inbox re: account 2761864020.)
4. **(Gautam)** Confirm the fax numbers +1 469 214 7801 and +1 214 540 9470 are the ones actively published to referrers. If one is deprecated, cancel it to reduce monthly extra-page risk.
5. **(Agent)** Do NOT send any outbound fax until Gautam explicitly approves per-message.

## References

- Welcome email (2022-07-08, exult-info@ mailbox) — plan/fax#/portal
- MyFax Courtesy Notice (2021-06-02, kaley.olsen@j2.com) — account holder = Deepika Bhargava M.D PA
- Email-changed notification (2024-02-20) — confirms same fax numbers still active
- MyFax FAQs (myfax.com/faqs, fetched 2026-04-11) — no API documented
- ws.myfax.com/2010/01/sending.asmx (probed 2026-04-11) — returns HTTP 400, legacy SOAP retired
- eFax Developer product overview (consensus.com) — upgrade path
- Exult Agent Service app (M365 Graph) — Mail.Read on fax@exulthealthcare.com confirmed working
