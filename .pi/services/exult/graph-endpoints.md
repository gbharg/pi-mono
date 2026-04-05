# Microsoft Graph Endpoints Used — Exult Non-AMD Baseline

Generated: 2026-04-05
Purpose: Document the exact Microsoft Graph API endpoints used to produce the mailbox volume section of `DAILY_BASELINE_NON_AMD.md`.

Tenant: `707a7153-af93-4b65-ae01-bfa6febbffdb` (exulthealthcare.com)
App: "Exult Agent Service" (client_id `6725660a-f83a-4cb0-8892-14a223e0a701`)
Permissions granted: `Mail.ReadWrite`, `User.ReadWrite.All`, `Directory.ReadWrite.All`

## Auth Mechanism

App-only OAuth 2.0 client_credentials flow. No user interaction. No refresh token needed (fetch a new access token each run; expires in 3600s).

### 1. Client Credentials Token

- Method: `POST`
- URL: `https://login.microsoftonline.com/707a7153-af93-4b65-ae01-bfa6febbffdb/oauth2/v2.0/token`
- Auth: none on the request itself; credentials are in body
- Content-Type: `application/x-www-form-urlencoded`
- Body params:
  - `client_id=<client_id>` (required)
  - `client_secret=<client_secret>` (required)
  - `scope=https://graph.microsoft.com/.default` (required — app-only requires `.default`)
  - `grant_type=client_credentials` (required)
- Response (200):
  ```
  {
    "token_type": "Bearer",
    "expires_in": 3599,
    "ext_expires_in": 3599,
    "access_token": "eyJ0..."
  }
  ```
- Source: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow

## 2. List Users (tenant mailbox inventory)

Used once to enumerate candidate front-desk mailboxes.

- Method: `GET`
- URL: `https://graph.microsoft.com/v1.0/users`
- Auth: `Authorization: Bearer <token>`
- Required permission: `User.Read.All` or `Directory.Read.All` (we have `Directory.ReadWrite.All`)
- Query params used:
  - `$select=id,displayName,mail,userPrincipalName,accountEnabled,userType` (trim payload)
  - `$top=999`
- Pagination: follow `@odata.nextLink` if present.
- Response shape:
  ```
  {
    "@odata.context": "...",
    "value": [
      { "id": "...", "displayName": "Reception Desk", "mail": "reception@exulthealthcare.com", ... },
      ...
    ],
    "@odata.nextLink": "https://graph.microsoft.com/v1.0/users?$skiptoken=..."
  }
  ```
- Rate limits: Graph mailbox endpoints share a per-app/tenant bucket ~10,000 requests / 10 min. One-shot call, no limits hit.
- Source: https://learn.microsoft.com/en-us/graph/api/user-list

## 3. List Messages Per Mailbox (per-day volume)

This is the per-mailbox call used to build the daily email volume buckets.

- Method: `GET`
- URL: `https://graph.microsoft.com/v1.0/users/{mailboxIdOrUpn}/messages`
- Auth: `Authorization: Bearer <token>`
- Required permission: `Mail.Read` or `Mail.ReadWrite` app-only (we have `Mail.ReadWrite`)
- Query params used:
  - `$filter=receivedDateTime ge 2026-01-01T00:00:00Z and receivedDateTime le 2026-04-05T23:59:59Z`
  - `$select=id,subject,from,receivedDateTime,hasAttachments,isRead,categories`
  - `$top=999`
  - `$orderby=receivedDateTime desc`
- Pagination: follow `@odata.nextLink`.
- Response shape:
  ```
  {
    "@odata.context": "...",
    "value": [
      {
        "id": "...",
        "subject": "...",
        "from": { "emailAddress": { "name": "...", "address": "sender@domain.com" } },
        "receivedDateTime": "2026-02-14T18:32:11Z",
        "hasAttachments": false,
        "isRead": true,
        "categories": []
      }, ...
    ],
    "@odata.nextLink": "..."
  }
  ```
- PHI handling: we do NOT retrieve `body`, `bodyPreview`, `toRecipients`, or `attachments` content. Only the header-level fields above. Subjects are used locally for regex-based category heuristics and are NOT written to the committed output — only aggregate counts per category per day per mailbox.
- Rate limits: app-wide ~15,000 Outlook API requests per 10-minute window per tenant. Throttled responses return 429 with `Retry-After`. We pace at ~2 req/sec and back off on 429.
- Source: https://learn.microsoft.com/en-us/graph/api/user-list-messages and https://learn.microsoft.com/en-us/graph/throttling-limits

## Category Heuristics (client-side classification)

Applied to `subject + from.emailAddress.address` per message. Not an API feature — purely local regex.

| Category | Trigger |
|---|---|
| Insurance/eligibility | sender domain ~ `aetna|bcbs|bluecross|cigna|humana|uhc|unitedhealth|optum|anthem|availity` OR subject ~ `eligibility|verification|benefits|claim` |
| Records request | subject ~ `records|release|ROI|subpoena|HIPAA authorization` |
| Fax notification | sender ~ `efax|srfax|faxage|rapidfax|metrofax|j2 ` OR subject ~ `incoming fax|new fax received` |
| Pharmacy / eRx | sender ~ `pharmacy|cvs|walgreens|riteaid|surescripts|eprescribe|covermymeds` OR subject ~ `prescription|refill|prior auth|pa request` |
| Patient inquiry | subject ~ `appointment|new patient|question|portal` AND sender not in other buckets |
| Vendor/spam | everything else |

## Endpoints NOT Used

- `/v1.0/users/{id}/mailFolders` — we don't need folder structure; filter is sufficient.
- `/v1.0/users/{id}/messages/$count` — Graph supports `$count=true` but not all combinations with `$filter` are reliable; easier to page.
- `/v1.0/chats` — requires `ChatMessage.Read.All` which is not granted; Teams section is skipped and documented as a gap.
- `/v1.0/users/{id}/calendar/events` — out of scope for this baseline (would be useful for meeting-load, but AMD owns appointment data).
