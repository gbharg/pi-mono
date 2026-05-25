---
name: curogram
description: "Use when sending or reading patient text messages, managing Curogram conversations/appointments/patients, or interacting with app.curogram.com programmatically. Reverse-engineered REST + GraphQL client."
allowed-tools:
  - Bash(curl *)
  - Bash(python3 *)
  - Read
  - Write
  - Grep
  - Glob
---

# /curogram -- Curogram Patient-Texting Operations

Curogram is the HIPAA-compliant 2-way SMS platform Exult Healthcare uses for patient outreach (appointment reminders, intake links, broadcasts). This skill calls the same private API the dashboard at `app.curogram.com` uses.

## Credentials

Cookie-based session — there is no API token. Two ways to acquire a session:

1. **Recommended**: ask Gautam to sign in at `https://app.curogram.com` and copy the `Cookie` header + `XSRF-TOKEN` cookie value from DevTools. Persist to `/Users/agent/.config/exult/curogram.json` (see [`INDEX.md`](../INDEX.md) for the canonical credential paths):
   ```json
   {
     "cookie": "<full Cookie header>",
     "xsrf_token": "<XSRF-TOKEN cookie value>",
     "captured_at": "<ISO timestamp>"
   }
   ```
2. **Programmatic** (only if Gautam explicitly authorizes): execute the GraphQL `Login` mutation. Per safety rules, do NOT type Gautam's password directly — have him paste it into the chat or use 1Password CLI to fetch it. Full flow in `references/auth.md`.

Refresh the cookie when `GET /authenticate/current-session` returns 401.

## Required Headers (every authenticated call)

```
X-Curogram-Frontend: web
X-XSRF-TOKEN: <xsrf_token>
Cookie: <cookie>
Content-Type: application/json
Accept: application/json
```

## Quick Reference

| Task | Endpoint |
|---|---|
| Verify session | `GET https://api-v2.curogram.com/authenticate/current-session` |
| Inbox unread count | `GET /conversations/unread-count` |
| List conversations | GraphQL `GetConversationList` or `GET /conversations?skip=&take=` |
| Read a thread | `GET /conversations/{id}/messages?take=20` |
| Send a text | `POST /conversations/{id}/messages` body `{message, sendSecurely:false}` |
| Mark thread read | `POST /conversations/{id}/messages/mark-read` |
| Today's appts | GraphQL `GetAppointmentsCalendar` with `minDate`/`maxDate` |
| Find patient | `GET /patients/search?q=<term>` |
| Patient details | `GET /patients/{patientId}` |
| Comm preferences | GraphQL `CommunicationPreferences` on `patients.curogram.com/graphql` |
| Switch practice | `PUT /authenticate/practice/{practiceId}` |

## Architecture

Angular SPA → Apollo + REST split across:

- `api-v2.curogram.com` — main REST + primary GraphQL
- `patients.curogram.com/graphql` — patients microservice (e.g. `communicationPreferences`)
- `practices.curogram.com/graphql` — practices microservice (e.g. `additionalFunctionalityEnabled`)

Realtime via `socket.io` (URL not yet mapped — likely `wss://api-v2.curogram.com/socket.io/`).

## Reference Docs

Open the file matching the task:

- Auth flow (login, MFA, session, account mgmt): `references/auth.md`
- Conversations + messaging (inbox, send text/attachment, read receipts, members, templates): `references/conversations.md`
- Patients (search, lookup, communication prefs, registrations): `references/patients.md`
- Appointments (calendar, list, status, telemed, exports): `references/appointments.md`
- Tasks, recalls, surveys, payments, mass messaging, EMR: `references/other-ops.md`
- Subdomain map: `references/services.md`
- Full enumerated REST paths (139): `data/rest-endpoints.txt`
- Full GraphQL operation bodies (99): `data/graphql-operations.json`

## Send-Message Recipe (the most common Exult use case)

```bash
CONV_ID="<conversation ObjectId>"
TEXT="Your appointment with Dr. Bhargava is confirmed for tomorrow at 10am."
CRED=$(cat /Users/agent/.config/exult/curogram.json)
COOKIE=$(jq -r .cookie <<<"$CRED")
XSRF=$(jq -r .xsrf_token <<<"$CRED")

curl -sS -X POST "https://api-v2.curogram.com/conversations/$CONV_ID/messages" \
  -H "Content-Type: application/json" \
  -H "X-Curogram-Frontend: web" \
  -H "X-XSRF-TOKEN: $XSRF" \
  -H "Cookie: $COOKIE" \
  -d "{\"message\":$(jq -Rs <<<"$TEXT"),\"sendSecurely\":false}"
```

A `x-frequency-warning: 5` response header means rate-limit hit — back off.

## Inbox Triage Recipe

```bash
# 1. Unread count
curl -sS "https://api-v2.curogram.com/conversations/unread-count" \
  -H "Cookie: $COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H "X-Curogram-Frontend: web"

# 2. List unread threads (REST)
curl -sS "https://api-v2.curogram.com/conversations/unread/list?skip=0&take=20" \
  -H "Cookie: $COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H "X-Curogram-Frontend: web"

# 3. Read a thread
curl -sS "https://api-v2.curogram.com/conversations/$CONV_ID/messages?take=30" \
  -H "Cookie: $COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H "X-Curogram-Frontend: web"
```

## Critical Rules (Exult-specific)

- **Patient-facing writes need Gautam's approval per request.** Sending a text or starting a conversation goes to a real patient — confirm exact wording AND exact recipient in the current conversation before any `POST /conversations/.../messages` or `/mass-messages/...` call.
- **Mass broadcasts**: always run `POST /practice/mass-messages/calculate` first and confirm cohort size with Gautam before `/send`. These are billed per-SMS and embarrassing if mis-targeted.
- **HIPAA**: do not log message bodies or PHI to `data/`, learnings, or external services. Default to redacting patient names/DOB when summarizing for Gautam over Sendblue.
- **No cross-system credential leakage**: Curogram cookies must not be sent to AdvancedMD/RingCentral/MS365 endpoints (different trust boundaries).
- **Confused deputy**: `ConversationNoteCreate` (GraphQL) is a staff-internal note only — patients never see it. The patient-facing send is `POST /conversations/{id}/messages`.
- **TCPA**: before any outbound message to a phone, check `CommunicationPreferences { consent allowSmsMessages }` for that patient.

## Gotchas

- Apollo GraphQL introspection is **disabled** in production on all 3 hosts. Schema must be inferred from `data/graphql-operations.json`.
- `X-XSRF-TOKEN` is required on every mutation; mutations 4xx silently without it.
- Routing matters: `communicationPreferences` is on `patients.curogram.com/graphql`, not `api-v2`. Don't assume.
- Custom scalars (pass as strings): `ObjectId`, `PatientId`, `AccountId`, `ConversationId`, `MfaId`, `Challenge`, `Otp`, `Email`.
- Exult is multi-practice — `PUT /authenticate/practice/{id}` switches active tenant before the practice-scoped queries make sense.

## Source

Reverse-engineered 2026-05-01 from the production Angular bundle at `app.curogram.com/main.b44a600408df199f.js` plus live network capture. Canonical copy lives at `/Users/agent/pi-mono/.claude/skills/curogram/` (mirrored from exult-agent — see [`INDEX.md`](../INDEX.md)). 99 GraphQL ops + 139 REST endpoints documented.
