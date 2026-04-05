# AdvancedMD API Reference — VALIDATED ENDPOINTS ONLY

> **Every entry in this file has been observed in a live network trace or successfully called against the real API.** For authoritative spec-sourced endpoints see `API_DOCUMENTATION.md`. For dropped guesses see the `dropped_from_prior_catalog` section at the bottom of `api_reference.json`.

**Tenant:** Exult Healthcare (`officeKey = 161112`)
**PM shard:** `pm-api-137` / `pm-wfe-137` (per-office, resolved via locator)
**Primary user:** `GAUTAM` (role `ADMIN`)

## Hosts

| Role | Host |
|---|---|
| PM REST API (Exult) | `https://pm-api-137.advancedmd.com` |
| PM Web Front-End | `https://pm-wfe-137.advancedmd.com/practicemanager` |
| Identity SPA | `https://static-100.advancedmd.com` |
| SSO / SAML / locator | `https://api-100.advancedmd.com` |
| Marketing login | `https://login.advancedmd.com` |

`pm-api-137` is assigned per-office by the locator service — **do not hard-code it for other tenants**. Always call `GET /api/locator/defaulturls?officeKey={key}` first.

## Authentication flow

1. `POST https://api-100.advancedmd.com/api/singlesignon/saml/uservalidationrequests/{officeKey}/{user}` → validates the combination.
2. `GET https://api-100.advancedmd.com/api/locator/defaulturls?officeKey={key}` → returns the pm-api / pm-wfe host for this office.
3. `POST https://pm-api-{shard}.advancedmd.com/api/authentication/preauth/status2fa` → returns a pre-auth `authorizationToken` (UUID) and the chosen 2FA method.
4. `POST .../api/authentication/preauth/send2faemail` → triggers the 2FA email (Exult: email only, SMS and TOTP disabled).
5. `POST .../api/authentication/token/access` with `grant_type=http://advancedmd.com/oauth/grant-type/mfa-totp`, `code=<6-digit>`, `authorizationToken=<UUID>`, `client_id=AdvancedMD.Authentication`.
6. The browser redirects to `https://static-100.advancedmd.com/apps/login/#/launch-app` which calls `window.open('https://pm-wfe-{shard}.advancedmd.com/practicemanager')`. This popup navigation sets the `.advancedmd.com` session cookies (`token`, `u`, `k`, `ku`, `appid`, `launchpayloadpm`, `pmapiredirecturl`).

### Gotchas (every one of these was hit the hard way)

- **Popup blocker kills the login.** If the launching browser blocks popups (default for headless and for Playwright Chrome-for-Testing without `--disable-popup-blocking`), step 6 silently fails, no session cookie is set, and the user sees a *"Compatibility check: Our application requires you to allow popups from advancedmd.com"* modal. Fix: relaunch with `--disable-popup-blocking`, or inject a `window.open` override via `Page.addScriptToEvaluateOnNewDocument` BEFORE the initial navigation.
- **Angular submit button only appears when `ng-valid`.** On the 2FA form, the only button visible before the input is filled is "Resend code". Once the input matches `^[0-9]{6}$`, a real submit button is rendered. `form.requestSubmit()` does NOT fire the Angular NgForm handler — you must simulate a real `.click()` on the enabled submit button.
- **400 responses contain raw C# stack traces, not JSON.** Check HTTP status before parsing.
- **2FA email only.** `preferredMethodType: EMAIL`. No SMS or TOTP for the GAUTAM account.
- **Attempts counter is per preauth token.** 5 verification attempts per issued preauth UUID. On the 6th failure, you must restart from step 1. Account is NOT locked.
- **2FA codes expire fast.** ~10 minutes. Each `send2faemail` call issues a NEW code; the old ones go stale immediately.
- **saml-session cookie is NOT a bearer.** Set on `api-100.advancedmd.com` during pre-auth, but alone it doesn't authenticate you against `pm-api-137` or the docs host.
- **PPMDResults localStorage is the "am I logged in" signal.** Key: `PPMDResults_{officeKey}_{user}` on `.advancedmd.com` origin. The `lst` field is the last touch. Inside `Results.usercontext` you get every service URL for the tenant.

## Endpoints (validated only)

### Authentication

| Method | Path | Host | Purpose | Validation |
|---|---|---|---|---|
| POST | `/api/singlesignon/saml/uservalidationrequests/{officeKey}/{user}` | api-100 | Validate user + office | network_trace_confirmed 2026-04-05 05:30Z |
| GET | `/api/locator/defaulturls?officeKey={key}` | api-100 | Resolve pm-api / pm-wfe shard for office | network_trace_confirmed 2026-04-05 05:30Z |
| POST | `/api/authentication/preauth/status2fa` | pm-api-{shard} | Begin MFA, returns pre-auth UUID + method | network_trace_confirmed 2026-04-05 05:30Z |
| POST | `/api/authentication/preauth/send2faemail` | pm-api-{shard} | Dispatch 2FA email | network_trace_confirmed 2026-04-05 09:31Z |
| POST | `/api/authentication/token/access` | pm-api-{shard} | Exchange code for session | network_trace_confirmed 2026-04-05 05:30Z |

### Patients

**`GET https://pm-api-137.advancedmd.com/api/patients`** — validation: `live_call_success` 2026-04-02T11:11Z (975 records successfully retrieved and saved to `/tmp/amd_patients.json`, 870KB).

**Query params**
- `officeid` (string, required) — `161112` for Exult
- `offset`, `limit` (int) — `limit=500` confirmed working
- `firstappointmentstart`, `firstappointmentend` (YYYY-MM-DD) — **filters patients whose first appointment falls in range.** Useful for "new patients added in Q1" queries.

**Response envelope is inconsistent** across calls. Observed:
- `{totalcount: int, patients: [...]}`
- `{count: int, data: [...]}`
- Raw array

Write defensive parsers.

**Fields per patient (36 total, ~890 bytes / ~222 tokens each):**
`id, licensekey, licensename, name, firstname, middlename, lastname, preferredname, chartnumber, ssn (whitespace-padded when masked), dob, deceased, inactive, inactivestatusid, inactivestatusdescription, inactivestatuscode, ispatientactive, gender, zipcode, homephone, officephone, officeextension, other, preferredphone, preferredphonetype, email, defaultepisodeid, defaultreferralplanid, defaultcopayamount, profileid, profilecode, address1, address2, photofileid, responsiblepartyid, hipaarelationship`

**Example (requires live token):**
```bash
curl 'https://pm-api-137.advancedmd.com/api/patients?officeid=161112&limit=1' \
  -H "Authorization: Bearer $AMD_TOKEN" \
  -H "amd-office-key: 161112"
```

### Session artifacts (not endpoints, but load-bearing)

**`localStorage['PPMDResults_161112_GAUTAM']`** — validated 2026-04-05T02:31-05:00 via CDP dump. Contains `Results.usercontext` with every tenant service URL. See `api_reference.json > localStorage_artifacts` for the full field list. The `helpurl` field (`https://ow2-help-01-prd.advancedmd.com/help/`) is the authoritative API docs root.

## Discovered service URLs (from live session)

From the `PPMDResults.usercontext` object captured during an authenticated session:

| Role | URL |
|---|---|
| PM WFE | `https://pm-wfe-137.advancedmd.com/practicemanager` |
| PM API | `https://pm-api-137.advancedmd.com` |
| EHR WFE | `https://wc-wfe-137.advancedmd.com/practicemanager` |
| EHR API | `https://wc-api-137.advancedmd.com/api/` |
| Appt reminder API | `https://pm-api-137.advancedmd.com/api/reminders` |
| Reporting server | `https://reportingservices-103.advancedmd.com/rs/reportrequest.aspx` |
| Adhoc reporting (BI) | `https://advancedinsight.advancedmd.com` |
| CQM SSO | `https://ow2-cqmsso-01.advancedmd.com/api/account` |
| CQM solution | `https://ow2-cqm-01.advancedmd.com` |
| Patient portal intake | `https://patientportal.advancedmd.com/161112/onlineintake` |
| Patient portal scheduling | `https://patientportal.advancedmd.com/161112/onlinescheduling` |
| **API docs** | `https://ow2-help-01-prd.advancedmd.com/help/` |

## Not yet validated

- Every `/fhir/v1/*` endpoint (dropped from catalog — paths were guesses)
- Every `/connect/v1/*` write endpoint (dropped — client stubs only)
- `/api/appointments` query and status-code enumeration
- OpenAPI/Swagger spec location (likely `/swagger/v1/swagger.json` on pm-api-137, untested)
- Eligibility, claims, billing, documents, messages, tasks, audit log, providers, encounters

## Rate limits

- Client convention (hipaa-agent-work): **5 req/s** via asyncio.Semaphore, 200ms inter-request floor. Not tested to failure.
- Observed server response times for auth flow: 100-400ms.
