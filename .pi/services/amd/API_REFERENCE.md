# AdvancedMD API Reference (Exult Healthcare, office 161112)

**Status: PARTIAL INDEX.** This document was assembled 2026-04-05 from (a) network traces of a live browser auth flow, (b) the hipaa-agent-work client code at `/tmp/hipaa-agent-work/hipaa_agent/integrations/`, and (c) the existing `/tmp/amd_patients.json` data dump from 2026-04-02. **No endpoints were probed with a live bearer token in this session** — authentication was blocked because the parallel Playwright session did not produce a working 2FA bearer (HTTP 400 "Invalid verification code" on last attempt). All `confidence: guess` entries need live verification.

## Hosts

| Role                    | Host                                          |
| ----------------------- | --------------------------------------------- |
| PM REST API (Exult)     | `https://pm-api-137.advancedmd.com`           |
| Identity / Login SPA    | `https://static-100.advancedmd.com`           |
| SAML / SSO / locator    | `https://api-100.advancedmd.com`              |
| Marketing login page    | `https://login.advancedmd.com`                |

The `pm-api-137` shard is assigned per-office by the locator service. **Do not hard-code** it for other offices — always call `GET /api/locator/defaulturls?officeKey={key}` first. The `100` shard in `api-100` and `static-100` appears to be a multi-tenant default.

## Office constants

- `officeKey` / `officeid` / `licensekey`: **`161112`**
- `licensename`: `Exult Healthcare`
- Primary login: `GAUTAM`
- Active providers: `BHAR00` (Bhargava, 741 pts), `DAVI00` (82), `MBIL00` (54), `TOLE00` (1)

## Authentication

**Flow (6 steps):**
1. `POST https://api-100.advancedmd.com/api/singlesignon/saml/uservalidationrequests/{officeKey}/{user}` → validates login+office pair
2. `GET https://api-100.advancedmd.com/api/locator/defaulturls?officeKey={key}` → returns the pm-api shard URL for this office
3. `POST https://pm-api-{shard}.advancedmd.com/api/authentication/preauth/status2fa` → returns a pre-auth `authorizationToken` (UUID)
4. `POST .../api/authentication/preauth/send2faemail` → triggers an **email** 2FA delivery (not SMS, not TOTP)
5. `POST .../api/authentication/token/access` with `grant_type=http://advancedmd.com/oauth/grant-type/mfa-totp`, `code=<6-digit email code>`, `authorizationToken=<UUID>`, `client_id=AdvancedMD.Authentication` → returns final `access_token`
6. All subsequent calls: `Authorization: Bearer <access_token>` + `amd-office-key: 161112` header

**Gotchas observed:**
- 2FA code delivery is **email only** for this account (`preferredMethodType: EMAIL`)
- 400 response body is a raw C# stack trace string, not JSON
- The `saml-session` cookie on `api-100.advancedmd.com` is set pre-auth — **it is not a usable bearer**
- Session expiry is short; the browser tab parked at `/#/login` after inactivity
- The Angular identity SPA stores some state in `localStorage` under key `PPMDResults_{officeKey}_{user}` (roles, toolbar, version) — useful for detecting "am I logged in?"

## Endpoint Index

### auth (observed, host = api-100 or pm-api-{shard})

| Method | Path                                                        | Host          | Purpose                                  |
| ------ | ----------------------------------------------------------- | ------------- | ---------------------------------------- |
| POST   | `/api/singlesignon/saml/uservalidationrequests/{key}/{user}`| api-100       | Validate user+office                     |
| GET    | `/api/locator/defaulturls?officeKey={key}`                  | api-100       | Resolve pm-api shard for an office       |
| POST   | `/api/authentication/preauth/status2fa`                     | pm-api-{s}    | Start MFA flow, get pre-auth token       |
| POST   | `/api/authentication/preauth/send2faemail`                  | pm-api-{s}    | Send 2FA code via email                  |
| POST   | `/api/authentication/token/access`                          | pm-api-{s}    | Exchange 2FA code for bearer             |

### patients (observed)

**`GET /api/patients`** — list/search patients

Query params:
- `officeid` (string, required) — office key
- `offset` (int), `limit` (int, 500 works)
- `firstappointmentstart`, `firstappointmentend` (YYYY-MM-DD) — **filters new patients whose first appt falls in range**
- `createddatefrom`, `createddateto` (YYYY-MM-DD) — UNVERIFIED, guessed

Response envelope is inconsistent — sometimes `{totalcount, patients: [...]}`, sometimes `{count, data: [...]}`, sometimes raw array. Defensive code required.

Top response fields per patient (36 total, ~890 bytes / ~222 tokens each):
- `id`, `chartnumber`, `name`, `firstname`, `lastname`
- `dob`, `gender`, `zipcode`, `homephone`, `email`
- `ispatientactive`, `inactive`, `deceased`
- `defaultepisodeid`, `defaultcopayamount`, `profilecode` (provider panel)
- `responsiblepartyid`, `hipaarelationship`

**Gotchas:** `ssn` is whitespace-padded even when masked; response shape inconsistent; `firstappointmentstart` filter is confirmed, `createddatefrom` is not.

Example (requires live token):
```bash
curl -s "https://pm-api-137.advancedmd.com/api/patients?officeid=161112&limit=1" \
  -H "Authorization: Bearer $AMD_TOKEN" \
  -H "amd-office-key: 161112"
```

### appointments (guess — from amd_metrics.py author notes)

**`GET /api/appointments`** ⚠️ _not verified against live API_

Query params: `officeid`, `startdate`, `enddate`, `aptstatus` (int), `offset`, `limit`

Status codes (per amd_metrics.py comment, source unknown):
- `1` = Scheduled
- `2` = Complete
- `3` = NoShow
- `4` = Cancelled
- `5` = Rescheduled

**Caveat:** These status codes are annotations from an unrun script. Verify with a small probe before building on them.

### FHIR R4 (guess — from hipaa-agent-work client, not verified)

Base path: `/fhir/v1/*`, Content-Type: `application/fhir+json`

| Method | Path                           | Params                         |
| ------ | ------------------------------ | ------------------------------ |
| GET    | `/fhir/v1/Patient/{id}`        | —                              |
| GET    | `/fhir/v1/Patient`             | `name`, `birthdate`            |
| GET    | `/fhir/v1/Appointment`         | `patient`, `date=ge|leYYYYMMDD`|
| GET    | `/fhir/v1/Condition`           | `patient`                      |

⚠️ **All FHIR endpoints are guesses.** They come from the hipaa-agent-work client stub, which may be aspirational rather than observed. AMD is known to offer FHIR via a separate endpoint (`/interfaces/fhir/R4/*` in some deployments) — do not assume `/fhir/v1/*` until verified.

### connect v1 — writes (guess — from hipaa-agent-work, not verified)

| Method | Path                                          | Purpose                |
| ------ | --------------------------------------------- | ---------------------- |
| POST   | `/connect/v1/appointments`                    | ⚠️ Create appointment  |
| PATCH  | `/connect/v1/appointments/{id}`               | ⚠️ Update appointment  |
| POST   | `/connect/v1/appointments/{id}/cancel`        | ⚠️ Cancel appointment  |
| POST   | `/connect/v1/charges`                         | ⚠️ Create charge       |
| GET    | `/connect/v1/patients/{id}/balance`           | ⚠️ Patient balance     |

**Safety rule from AMD Read-Only memory:** All writes require explicit Gautam approval per request. The hipaa-agent-work client enforces `requires_approval=True` — respect that.

### PPMD legacy (localStorage artifact only)

The Angular SPA caches an object in `localStorage` under `PPMDResults_{officeKey}_{user}`:

```json
{"s":"advancedmd-api-processrequest-7-...","lst":"04/04/2026 22:33:31",
 "Results":{"success":"1","api":"0","rolename":"ADMIN","toolbarcode":"standard","version":"26.1"}}
```

This strongly suggests a `/processrequest` (or `/ppmd/processrequest`) legacy endpoint using AMD's classic XML/JSON command envelope. Worth probing once auth works — that's how most AMD third-party tools talk to the PM system.

## NOT yet discovered (worth probing once auth is live)

- Eligibility / insurance verification (`/api/eligibility`, `/api/insurance/*`)
- Claims / billing status (`/api/claims`, `/api/remittance`)
- Documents / clinical attachments (`/api/documents`)
- Patient portal messaging (`/api/messages`, `/api/inbox`)
- Tasks / to-do lists (`/api/tasks`)
- Audit log (`/api/audit`)
- Provider / staff directory (`/api/providers`, `/api/users`)
- Setup / configuration (`/api/setup`, `/api/config`)
- Encounters / SOAP notes (`/api/encounters`, `/api/visitnotes`)
- OpenAPI/Swagger — try `/openapi.json`, `/swagger.json`, `/swagger/v1/swagger.json`, `/swagger/index.html` on `pm-api-137`

## Rate limits

- Per `hipaa-agent-work/integrations/amd_connect_client.py`: **5 req/s** via `asyncio.Semaphore`, enforced with a 200ms inter-request floor
- Observed server response times for auth flow: 100-400ms
- No documented ceiling found

## Next steps to complete this index

1. Obtain live bearer (requires working 2FA email flow)
2. Hit the Swashbuckle/Swagger URLs — `pm-api-*.advancedmd.com` is a .NET API; OpenAPI is likely exposed in some form
3. Read the compiled Angular bundle at `https://static-100.advancedmd.com/apps/pm/main.*.js` — front-end code has every endpoint baked in
4. Probe the 9 undiscovered categories listed above
5. For each discovered endpoint, capture: real response shape, pagination quirks, error envelope format, typical latency

## Files referenced

- Live browser session trace: `/tmp/amd_st_login_out.txt` (48KB)
- 2FA attempt output: `/tmp/claude-502/-Users-agent-pi-mono/f142ba49-711a-42ea-ad8c-7c124ef55c03/tasks/blhyjsmoz.output`
- Unrun metrics script (has endpoint list): `/tmp/amd_metrics.py`
- Unrun 2FA entry script: `/tmp/amd_enter_2fa.py`
- Apr 2 patient dump (975 records, 870KB): `/tmp/amd_patients.json`
- hipaa-agent-work client code: `/tmp/hipaa-agent-work/hipaa_agent/integrations/amd_{connect,fhir}_client.py`
- Machine-readable index: `/Users/agent/pi-mono/.pi/services/amd/endpoints.json`
