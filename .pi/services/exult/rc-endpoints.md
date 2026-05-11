# RingCentral Endpoints Used — Exult Non-AMD Baseline

Generated: 2026-04-05
Purpose: Document the exact RingCentral Platform API endpoints used to produce `DAILY_BASELINE_NON_AMD.md`. Provenance for every number in the call-volume section.

Platform base URL: `https://platform.ringcentral.com`
Account: Exult Healthcare (account_id `2761864020`)
Auth app: "Remote Admin" (JWT-authenticated confidential app)

## Auth Mechanism

All RingCentral calls use a short-lived OAuth bearer access token obtained from a long-lived JWT assertion (permanent, no expiry) stored in `/Users/agent/pi-mono/.config/exult/ringcentral.json`.

### 1. JWT-to-Access-Token Exchange

- Method: `POST`
- URL: `https://platform.ringcentral.com/restapi/oauth/token`
- Auth: HTTP Basic with `client_id:client_secret`
- Content-Type: `application/x-www-form-urlencoded`
- Body params:
  - `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` (required)
  - `assertion=<JWT>` (required — the pre-issued JWT string from credentials file)
- Response (200):
  ```
  {
    "access_token": "...",
    "token_type": "bearer",
    "expires_in": 3600,
    "scope": "ReadCallLog ReadAccounts ..."
  }
  ```
- Rate limits observed: none hit.
- Source: https://developers.ringcentral.com/guide/authentication/jwt-flow

## 2. Account Call Log (Detailed)

This is the single data endpoint used for the non-AMD phone metrics.

- Method: `GET`
- URL: `https://platform.ringcentral.com/restapi/v1.0/account/~/call-log`
- Auth: `Authorization: Bearer <access_token>`
- Required scope: `ReadCallLog`
- Query params used:
  | Name | Value | Notes |
  |---|---|---|
  | `dateFrom` | `2026-01-01T00:00:00.000Z` | ISO 8601 UTC, inclusive lower bound |
  | `dateTo` | `2026-04-05T23:59:59.999Z` | ISO 8601 UTC, exclusive upper bound |
  | `view` | `Detailed` | Returns full call segments/legs, result, duration |
  | `perPage` | `1000` | Max page size |
  | `page` | `1..N` | Paginated; loop until `records.length < perPage` |
- Other params available (not used): `type`, `direction`, `extensionNumber`, `phoneNumber`, `withRecording`, `showDeleted`, `showBlocked`, `transport`.
- Response shape (top-level):
  ```
  {
    "uri": "...",
    "records": [
      {
        "id": "...",
        "sessionId": "...",
        "startTime": "2026-01-15T14:23:45.000Z",
        "duration": 142,                         // seconds, total call length
        "type": "Voice",                         // or Fax
        "direction": "Inbound" | "Outbound",
        "action": "Phone Call" | "VoIP Call" | ...,
        "result": "Accepted" | "Missed" | "Voicemail" | "Hang Up" | "Abandoned" | "Call connected" | ...,
        "to": { "phoneNumber": "+1...", "extensionNumber": "104", "extensionId": "..." },
        "from": { "phoneNumber": "+1...", "extensionNumber": "101", "extensionId": "..." },
        "legs": [ ... ]                          // present when view=Detailed
      }, ...
    ],
    "paging": { "page": 1, "perPage": 1000, "pageStart": 0, "pageEnd": 999, "totalPages": N, "totalElements": N },
    "navigation": { "firstPage": {...}, "nextPage": {...}, "lastPage": {...} }
  }
  ```
- PHI handling: `to.phoneNumber` / `from.phoneNumber` are external caller IDs and MUST NOT be emitted in any committed aggregate. Only extension numbers (clinic staff identifiers), timestamps, and directions/durations are used for aggregation. No caller numbers are written to the CSV or markdown output.
- Rate limits: RingCentral Heavy API category (1000 calls/min account, ~40 req/min/user for heavy). We throttle 0.3s between pages. No 429s observed.
- Retry behavior: on HTTP 429, honor `Retry-After` header.
- Source: https://developers.ringcentral.com/api-reference/Call-Log/readUserCallLog and https://developers.ringcentral.com/api-reference/Call-Log/readAccountCallLog

## Notes on Derived Fields

The raw endpoint does not directly provide "missed call" — it's derived client-side from `result in {Missed, Voicemail, Abandoned}` combined with `direction == Inbound`. "Answered" is `direction == Inbound and duration > 0 and result not in Missed set`.

Local-time conversion for daily buckets: RC returns UTC. We convert to America/Chicago, handling the DST shift on 2026-03-08 02:00 local (CST -06:00 → CDT -05:00). Daily buckets use the local date of the call's `startTime`.

## Endpoints NOT Used (but considered)

- `/restapi/v1.0/account/~/extension` — would list extensions to map IDs to names. Skipped because the CSV rollup groups by extensionNumber (already in the call-log response), avoiding an extra call and extra scope dependencies.
- `/restapi/v1.0/account/~/presence` — real-time status, not relevant for historical call log.
- `/restapi/v1.0/account/~/active-calls` — real-time only, not historical.
- `/restapi/v1.0/account/~/call-recording` — would retrieve recordings. Skipped; recordings contain PHI and are out of scope for a volume baseline.
