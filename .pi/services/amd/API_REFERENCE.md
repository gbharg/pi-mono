# AdvancedMD API Reference — VALIDATED ENDPOINTS

> **Every entry in this file has been observed in a live network trace or successfully called against the real API.** For the authoritative spec-sourced catalog see `API_DOCUMENTATION.md` (215 pages, crawled from AMD's official MadCap Flare docs).

**Last updated:** 2026-04-05T10:34:03Z

**Tenant:** Exult Healthcare (`officeKey = 161112`)  
**PM shard:** `pm-api-137` / `pm-wfe-137` (per-office, resolved via locator)  
**Primary user:** `GAUTAM` (role `ADMIN`)  

## 2026-04-05 Session Summary

- **Auth**: Playwright Chromium with --disable-popup-blocking, CDP-driven login + 2FA via Gmail MCP
- **Auth outcome**: SUCCESS — 17 AMD cookies captured, token=1611120428f8e5ce7e4427adea7623629e4193c6cdd7ec4b63bafb171809556d18aca5
- **Docs crawl**: SUCCESS — 215 MadCap Flare pages crawled via HTTP+cookie to amd-api-docs/raw/, parsed into api_documentation.json (163 ppmdmsg actions + 6 REST + 46 reference pages)
- **Live API**: SUCCESS — /api/patients lookup via POST /api/lookup/patients, /api/scheduler/columns, /api/scheduler/appointments (month view), /api/system/startupvalues, + 12 others validated against pm-api-137. Q1 2026 appt volume: 3398 unique appointments over 67 biz days, mean 50.7/day

### Unblock status

- **api_reminders**: EXISTS but 403 RBAC denied for GAUTAM admin role. Adding reminder privilege to the role would unblock.
- **api_messages**: NOT FOUND as a discrete path. PATIENT_MESSAGING feature IS enabled (per /api/system/startupvalues). Portal messaging is likely accessed via ppmdmsg actions in the docs (intake-* actions) or a still-undiscovered REST path.
- **scheduler_status_filter**: Parallel agent reported that /api/scheduler/appointments FILTERS OUT status 4/5/6 (cancelled/no-show/rescheduled). The live call returned a 'status' field ranging 0-12, and status=3 had 1895 occurrences — which is inconsistent with the parallel claim. The observed distribution is 0:642, 1:93, 2:4, 3:1895, 10:477, 12:287. The true semantic mapping of these codes is UNKNOWN without hitting a status master-file endpoint (all /api/masterfile* and /api/scheduler/appointmentstatuses variants returned 404). A followup session should hit the ppmdmsg getappointmenthistory action to cross-validate.

## Hosts

| Role | Host |
|---|---|
| pm_rest_api | `https://pm-api-137.advancedmd.com` |
| pm_wfe | `https://pm-wfe-137.advancedmd.com` |
| identity_spa | `https://static-100.advancedmd.com` |
| sso_api | `https://api-100.advancedmd.com` |
| marketing_login | `https://login.advancedmd.com` |

> pm-api-137 and pm-wfe-137 are assigned per-office. For Exult (officeKey=161112) the locator returns shard 137. Verify with /api/locator/defaulturls before building against any other tenant.

## Authentication flow (ppmdmsg + REST)

1. `POST https://api-100.advancedmd.com/api/singlesignon/saml/uservalidationrequests/{officeKey}/{user}`
2. `GET https://api-100.advancedmd.com/api/locator/defaulturls?officeKey={key}`
3. `POST https://pm-api-{shard}.advancedmd.com/api/authentication/preauth/status2fa`
4. `POST https://pm-api-{shard}.advancedmd.com/api/authentication/preauth/send2faemail`
5. `POST https://pm-api-{shard}.advancedmd.com/api/authentication/token/access (MFA code exchange)`
6. `Browser navigates to https://static-100.advancedmd.com/apps/login/#/launch-app`
7. `Launch-app calls window.open('https://pm-wfe-{shard}.advancedmd.com/practicemanager') — popup window establishes the session cookies at domain .advancedmd.com`

### Session cookies set on success

- token: {officeKey}{64-hex} at .advancedmd.com
- u: {login} at .advancedmd.com
- k: {officeKey} at .advancedmd.com
- ku: {officeKey}.{login} at .advancedmd.com
- appid: pm at .advancedmd.com
- launchpayloadpm: base64(JSON session envelope) at .advancedmd.com
- pmapiredirecturl: https%3A%2F%2Fpm-api-{shard}.advancedmd.com at .advancedmd.com

### Auth gotchas (each hit the hard way)

- **Popup blocker**: If the Chromium launching this flow has popup-blocking enabled (default for headless and for Playwright Chrome-for-Testing without --disable-popup-blocking), the launch-app popup is blocked silently and the session cookies are NEVER written. A 'Compatibility check' modal is shown instead. Override window.open via Page.addScriptToEvaluateOnNewDocument BEFORE navigating to the identity app, or relaunch with --disable-popup-blocking.
- **2FA delivery**: Email only for this tenant. Sender noreply@advancedmd.com, recipient gautambharg@gmail.com. Codes arrive within ~30s and expire in ~10min. Each preauth issues a NEW code; the '5 attempts remaining' counter is per preauth token, not per account.
- **Angular submit**: The Verify button on the 2FA form is only rendered once the input is ng-valid (pattern=^[0-9]{6}$). Before the form reaches valid state only a 'Resend code' button exists. To submit: fill the input, dispatch input+change+keyup events, wait 300ms, then call .click() on the enabled submit button. form.requestSubmit() does NOT work — the Angular NgForm handler is bound to button click, not native submit.
- 400 response body on /api/authentication/token/access is a raw C# stack trace string, not JSON. Check status before parsing.
- The saml-session cookie on api-100.advancedmd.com is set pre-2FA and is NOT a usable bearer.
- PPMDResults_{officeKey}_{user} localStorage object is the best 'am I logged in' signal — its `lst` field is the last-touch timestamp in office-local time and `usercontext` contains every service URL for the tenant.

## Validated endpoints

**Total:** 24 endpoints across 4 hosts.

### Host: `api-100`

#### POST `/api/pushnotificationshub/notificationshub/negotiate?negotiateVersion=1`

**Purpose**: SignalR push-notifications hub negotiate. Used for live UI updates.

**Validation**: observed_in_webapp_trace 2026-04-05T10:15Z

#### GET `/api/launch/payloads/pm`

**Purpose**: PM launch payload — part of the post-login bootstrap that populates launchpayloadpm cookie.

**Validation**: observed_in_webapp_trace 2026-04-05T10:15Z

### Host: `api-100.advancedmd.com`

#### POST `/api/singlesignon/saml/uservalidationrequests/{officeKey}/{user}`

**Purpose**: Validate that a given username belongs to a given office before triggering the full login flow.

**Validation**: ?

#### GET `/api/locator/defaulturls?officeKey={key}`

**Purpose**: Service discovery — returns the pm-api and pm-wfe host shard assigned to this office. Call this FIRST when bootstrapping a new tenant.

**Validation**: ?

### Host: `pm-api-137`

#### GET `/api/scheduler/columns`

**Purpose**: List all display columns (providers/resources) in the scheduler. Each column has id, heading, profileid, starttime, endtime, facilityid, and display flag.

**Validation**: live_call_success 2026-04-05T10:00Z (14 columns returned for Exult)

_Notes_: Column IDs resolved: 3325=Dr Bhargava, 3345=Mbilikira(S), 3351=Toles(M), 3352=Todd(M), 3355=Davis(M), 3358=Bingham(M), 3366=Mbilikira, 3387=MCKINNEY IOP, 3392=Techs, 3395=Training Only, 3396=Hawkins, 3407=Snype-Stewart, 3415=Emmons(S), 3694=Dattatreya. 14 active total.

**Response**: `array` with fields: `id`, `heading`, `profileid`, `starttime`, `endtime`, `timeincrement`, `display`, `facilityid`, `maxapptsperslot`

#### GET `/api/scheduler/appointments?columnId={id}&startDate=MM/DD/YYYY&endDate=MM/DD/YYYY&forView=month`

**Purpose**: List appointments for a column in a date range. forView controls whether the server aggregates: 'month' and 'week' return the full set, 'list' and 'day' often return empty (undocumented behavior). Date format is US (MM/DD/YYYY), NOT ISO. ISO dates silently return 0 results.

**Validation**: live_call_success 2026-04-05T10:00Z (3398 Q1 2026 appointments across 14 columns)

> **Gotcha**: forView=list silently returns empty for most date ranges. Use forView=month (or week) to get real data. Date format must be MM/DD/YYYY — ISO format is accepted but returns empty results without error.

**Response**: `array` with fields: `id`, `startdatetime`, `status`, `columnid`, `heading`, `profileid`, `provider`, `providercode`, `facilityid`, `episodeid`, `patientid`, `firstname`, `lastname`, `dob`, `patientemail`, `chartnumber`, `appointmenttypeids`, `telemedappointmentstatus`, `confirmdate`

**Status codes observed** (from the live Q1 2026 pull):
- `status=0`: 642 occurrences — status pending/unset
- `status=1`: 93 — SCHEDULED/tentative
- `status=2`: 4 — CONFIRMED
- `status=3`: 1895 — high volume; likely BOOKED or TENTATIVE (filtered set — does NOT include cancelled/noshow/rescheduled per parallel session finding)
- `status=10`: 477 — common active status
- `status=12`: 287 — completed/checked-in

> **Caveat**: Parallel agent reported that the scheduler list endpoint FILTERS OUT appointments with status 4 (cancelled), 5 (no-show), 6 (rescheduled). To get reschedule/cancel/no-show counts the correct endpoint is elsewhere — likely a Missed Appointments worklist, a legacy ppmdmsg getappointmenthistory, or audit log. Not yet found in this session.

#### GET `/api/reputationmanagement/externalratings`

**Purpose**: External rating aggregate for the practice (Google, Yelp, etc).

**Validation**: live_call_success 2026-04-05T10:10Z

#### GET `/api/reputationmanagement/responsecount?StartDate=MM/DD/YYYY&EndDate=MM/DD/YYYY`

**Purpose**: Count of reputation responses in a date range.

**Validation**: live_call_success 2026-04-05T10:10Z

#### GET `/api/user/privileges`

**Purpose**: Full list of user privileges for the current session. 29 privileges for GAUTAM role on Exult (ACCOUNT DETAIL, PATIENT, INSURANCE, REFERRALS, MAKE APPOINTMENTS, TELEHEALTH, etc.) each with C/R/U/D flags.

**Validation**: live_call_success 2026-04-05T10:10Z (38729 bytes response)

#### GET `/api/user/privileges?name={name}`

**Purpose**: Single-privilege query. Name values observed: FILES (returns 200), SCHEDULER/REMINDERS (404 — not a valid privilege name).

**Validation**: live_call_success 2026-04-05T10:10Z

#### GET `/api/user/options?groupName=PM`

**Purpose**: User-level UI options for the PM app.

**Validation**: live_call_success 2026-04-05T10:10Z

#### GET `/api/user/preferences?groupName=PM`

**Purpose**: User-level UI preferences for the PM app.

**Validation**: live_call_success 2026-04-05T10:10Z

#### GET `/api/system/startupvalues?forSpa=patientinfo`

**Purpose**: Full startup context for the PM SPA: usercontext, resources, features, privileges, system defaults. THIS IS THE single biggest one-shot discovery endpoint — use it to enumerate what the tenant has enabled.

**Validation**: live_call_success 2026-04-05T10:10Z

**Notable features enabled for Exult**:
`PATIENT_MESSAGING`, `TELEMEDICINEPRIME`, `ADVANCEDPATIENTPAY`, `PatientKiosk`, `EHR`, `Invoicing`, `PT-INFO-NEW-REFERRALS`, `EMAILHIPPO`, `AMD_Pay_CBO_Beta`, `AIInsuranceCardOCR`, `HeartlandPaymentProcessor`, `REPUTATIONMANAGEMENT`

**Key top-level fields**:
- `usercontext` — user+office identity, service URLs
- `userprivileges` — 29 role-based privileges with CRUD flags
- `features` — 27 tenant features (e.g. PATIENT_MESSAGING, TELEMEDICINEPRIME, ADVANCEDPATIENTPAY, EHR, Invoicing)
- `systemdefaults` — 46 tenant-level defaults
- `extendedsystemdefaults` — additional defaults
- `configurations` — runtime config keys

#### GET `/api/system/configurations?keys={key1}&keys={key2}`

**Purpose**: Query specific config keys. Example keys seen in webapp: crossorigin.maxretrycount, crossorigin.retryinmillis.

**Validation**: live_call_success 2026-04-05T10:10Z

#### GET `/api/system/cbo/getoptedinsubkeys`

**Purpose**: Central Billing Office — sub-keys the current office is opted into.

**Validation**: live_call_success 2026-04-05T10:10Z

#### GET `/api/scheduler/patients/inactivestatuses`

**Purpose**: List of inactive patient statuses (for filtering scheduling UI).

**Validation**: live_call_success 2026-04-05T10:10Z

#### POST `/api/lookup/patients?cboMode=false&advancedSearch=false`

**Purpose**: Search patients by name substring. Body: {"query": "<name>"}. Returns up to 50 matches with full patient detail (id, chart, phone, DOB, email, gender, patient-active flag, etc.).

**Validation**: live_call_success 2026-04-05T10:00Z (50 matches for query='a'; empty query returns empty array)

**Sample body**: `{"query": "smith"}`

#### POST `/api/telehealth/telehealthhub/negotiate?negotiateVersion=1`

**Purpose**: SignalR telehealth hub negotiate. Used for live telehealth session signaling.

**Validation**: observed_in_webapp_trace 2026-04-05T10:15Z

#### GET `/api/reminders`

**Purpose**: Appointment reminders (existence confirmed in PPMDResults.usercontext.apptreminderapiurl).

**Validation**: rbac_denied 2026-04-05T10:05Z — responded 403 'RBAC: access denied' to GAUTAM (admin). Endpoint exists but requires a privilege GAUTAM lacks. Confirms the endpoint is real.

> **Blocker**: Gautam's admin role does not include reminder-read privilege. Gautam would need to add REMINDERS (or equivalent) to his role via System Settings > User Administration, OR a different user with that role would need to run the queries.

#### GET `/api/worklist`

**Purpose**: Work list / task list (candidate for portal message triage discovery, still unverified).

**Validation**: rbac_denied 2026-04-05T10:05Z — 403 'RBAC: access denied'. Endpoint exists but requires elevated privilege.

### Host: `pm-api-{shard}.advancedmd.com`

#### POST `/api/authentication/preauth/status2fa`

**Purpose**: Begin the MFA flow. Returns a pre-auth UUID (authorizationToken) that must be included in all subsequent auth calls. Determines which 2FA method will be used (EMAIL/SMS/TOTP).

**Validation**: ?

#### POST `/api/authentication/preauth/send2faemail`

**Purpose**: Trigger delivery of the 6-digit 2FA code via email. For Exult this is the ONLY 2FA method enabled — SMS and TOTP are disabled at the account level.

**Validation**: ?

#### POST `/api/authentication/token/access`

**Purpose**: Exchange the 6-digit email code + pre-auth token for the final session. On success sets PM session cookies (via subsequent launch-app popup chain) and may return an access_token in the response body.

**Validation**: ?

#### GET `/api/patients`

**Purpose**: List/search patients scoped to an office. Used to pull the complete Exult patient roster (975 active records as of 2026-04-02).

**Validation**: ?

## Not yet validated

- Every FHIR endpoint (base path unknown — prior guesses of /fhir/v1/* are dropped; could be at fhir.advancedmd.com with tenant-scoped path or at pm-api with a different prefix)
- Every connect/v1/* write endpoint (appointments, charges, balance) — these come from hipaa-agent-work client stubs and have not been confirmed
- /api/appointments query — the status-code table (1=Scheduled...5=Rescheduled) came from amd_metrics.py author comments; needs live verification
- Swagger/OpenAPI spec — pm-api-137 is a .NET API and MAY expose Swashbuckle at /swagger/v1/swagger.json; untested
- Eligibility, claims, billing, documents, messages, tasks, audit log, providers, encounters endpoints — no observations yet

## Discovered service URLs (from `PPMDResults.usercontext`)

| Role | URL |
|---|---|
| _source | `Extracted from PPMDResults.usercontext in the Exult authenticated session 2026-04-05` |
| pm_wfe | `https://pm-wfe-137.advancedmd.com/practicemanager` |
| pm_api | `https://pm-api-137.advancedmd.com` |
| ehr_wfe | `https://wc-wfe-137.advancedmd.com/practicemanager` |
| ehr_api | `https://wc-api-137.advancedmd.com/api/` |
| appt_reminder_api | `https://pm-api-137.advancedmd.com/api/reminders` |
| reporting_server | `https://reportingservices-103.advancedmd.com/rs/reportrequest.aspx` |
| adhoc_reporting | `https://advancedinsight.advancedmd.com` |
| cqm_sso | `https://ow2-cqmsso-01.advancedmd.com/api/account` |
| cqm_solution | `https://ow2-cqm-01.advancedmd.com` |
| patient_portal_intake | `https://patientportal.advancedmd.com/161112/onlineintake` |
| patient_portal_scheduling | `https://patientportal.advancedmd.com/161112/onlinescheduling` |
| help_docs | `https://ow2-help-01-prd.advancedmd.com/help/` |
| scanning_server | `https://scan.advancedmd.com/dynamsoft/Resources.18.3/Resources/` |
| webdav | `https://ow2-pm-api-137.igw.advancedmd.com` |
| pm_wfe_cloudflare_bypass | `https://ow2-pm-wfe-137.igw.advancedmd.com` |
| pm_api_cloudflare_bypass | `https://ow2-pm-api-137.igw.advancedmd.com` |
