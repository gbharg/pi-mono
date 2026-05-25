# AdvancedMD — Authentication & Authorization

AdvancedMD exposes three distinct auth surfaces, one per API tier.

## Endpoints

| Purpose | URL |
|---------|-----|
| OAuth Authorize | `https://providerapi.advancedmd.com/v1/oauth2/authorize` |
| OAuth Token | `https://providerapi.advancedmd.com/v1/oauth2/token` |
| FHIR R4 Base | `https://providerapi.advancedmd.com/v1/r4/{org_id}/{resource}` |
| FHIR Bulk Base | `https://providerapi.advancedmd.com` (paths under `/v1/r4/Group/` and `/v1/fhir-bulk/`) |
| Connect API | Per-tenant URL provided after Certified Developer Agreement |

For Smart App Launch metadata: `GET https://providerapi.advancedmd.com/v1/r4/{org_id}/metadata` (Conformance/CapabilityStatement).

## 1. FHIR Single Patient — 3-legged OAuth (Authorization Code)

Used by patient-facing and provider-facing apps. The user authenticates with their AdvancedMD Patient Portal (patient) or AdvancedEHR (provider) credentials.

### Step 1 — Authorize Request

```
GET /v1/oauth2/authorize?
  response_type=code
  &client_id={client_id}
  &redirect_uri={url}
  &launch={launch_token}            # only on EHR-launched apps
  &scope=openid+fhirUser+offline_access+online_access+patient/*.read
  &state={opaque}
  &aud=https://providerapi.advancedmd.com/v1/r4/{org_id}
```

| Param | Required | Notes |
|-------|----------|-------|
| `response_type` | yes | Fixed: `code` |
| `client_id` | yes | From the Dev Portal app dashboard (API Keys → Key) |
| `redirect_uri` | yes | Must match a pre-registered redirect URI exactly |
| `launch` | conditional | Required for EHR launch flow; matches the value passed from the EHR |
| `scope` | yes | Space-delimited list (see Scopes below) |
| `state` | yes | Opaque CSRF token round-tripped to redirect_uri |
| `aud` | yes | The FHIR resource server URL the app is for |

The browser is redirected to AdvancedMD's login screen. The user picks patient-vs-provider, enters credentials, optionally selects a patient (provider flow), and grants/denies scopes.

### Step 2 — Authorization Code

On approval, AMD redirects to `{redirect_uri}?code={code}&state={state}`. The code is **short-lived (~60 seconds)**.

### Step 3 — Token Exchange

```
POST /v1/oauth2/token
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code={code}&redirect_uri={url}
```

Response (200):
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid fhirUser patient/*.read offline_access",
  "id_token": "<JWT>",        // when openid + fhirUser requested
  "refresh_token": "...",     // when offline_access requested
  "patient": "12345"          // when launched in patient context
}
```

The `patient` claim — if present — is the FHIR Patient ID; the access token is scoped to that patient.

### Step 4 — FHIR API Calls

```
GET /v1/r4/{org_id}/Patient/{id}
Authorization: Bearer {access_token}
```

### Step 5 — Refresh

```
POST /v1/oauth2/token
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={refresh}&scope=<optional sub-set>
```

Response replaces the `access_token` (and optionally `refresh_token` — if returned, discard the old one).

## 2. FHIR Single + PKCE (Proof Key for Code Exchange)

Strictly recommended for public clients (mobile, SPA). Adds two params to Step 1 and one to Step 3.

### Step 1 (additions)

| Param | Required | Notes |
|-------|----------|-------|
| `code_challenge` | yes | `BASE64URL(SHA256(code_verifier))` |
| `code_challenge_method` | yes | Fixed: `S256` (plain is not supported) |

### Step 3 (additions)

| Param | Required | Notes |
|-------|----------|-------|
| `code_verifier` | yes | The original random verifier (43–128 chars) |

When PKCE is used, the `Authorization: Basic` header MAY still be sent (confidential client) but is not strictly required for code redemption — the verifier proves possession of the challenge.

## 3. FHIR Bulk — SMART Backend Services (Client Credentials + JWT)

Two-legged, no end-user. Used by population-health and analytics apps that pull NDJSON exports for a Group.

### Setup (one-time)

1. Generate RSA-256 (or ES384) keypair.
2. Publish JWKS at a public HTTPS URL.
3. Submit JWKS URL to AdvancedMD InterOps along with your Bulk app registration.

### Step 1 — Token Request

Construct a signed JWT (`client_assertion`) with:

| Claim | Value |
|-------|-------|
| `iss` | client_id |
| `sub` | client_id |
| `aud` | `https://providerapi.advancedmd.com/v1/oauth2/token` |
| `jti` | unique nonce |
| `iat` | now |
| `exp` | now + 300s |
| header `alg` | `RS256` or `ES384` |
| header `kid` | matches JWKS entry |

POST to token endpoint:

```
POST /v1/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion={signed_jwt}
&scope=system/*.read
```

Response: `{ access_token, token_type: "Bearer", expires_in, scope }`. No refresh — re-request when expired.

### Step 2 — Use Token + OfficeKey

```
GET /v1/r4/Group/{groupId}/$export
Authorization: Bearer {token}
OfficeKey: 991900
prefer: respond-async
```

The `OfficeKey` header is **mandatory on every Bulk call** — it identifies the tenant.

### Sandbox JWT-only Test Endpoint

For testing only — to generate test JWTs against AdvancedMD's sandbox JWKS:
- FHIR Bulk JWKS API exists at `https://fhir.advancedmd.com/docs/fhirbulkjwksr4/1/overview` (currently returning a snapshot error — endpoint is provisional).
- For your own Bulk app, **don't** use this endpoint. Generate JWTs locally with your private key and submit your JWKS URL.

## 4. Connect API — Username/Password + OfficeKey (XML-RPC)

The legacy / partner Connect API uses session-style auth via the `ProcessRequest` XML-RPC operation. After signing a Certified API Developer Agreement, AMD provides:

- Per-environment endpoint URL (e.g., a `*.advancedmd.com` host)
- A test `OfficeKey` (integer) for the sandbox
- API username + password (separate from EHR/Portal credentials)
- A documentation packet (PMSXML, EHRXML schemas)

Each XML-RPC call carries:

```xml
<ppmdmsg action="..." class="..." username="..." password="..." officekey="...">
  <!-- operation-specific body -->
</ppmdmsg>
```

The same `(username, password, officekey)` triple is used per-request. There is no separate token-issuance step.

For REST variants of the Connect API, AdvancedMD issues OAuth 2.0 tokens via a separate flow (details provided after partner agreement). The newer Connect REST APIs use Bearer tokens.

## Supported OAuth Scopes

| Scope | Purpose |
|-------|---------|
| `openid` | Enables OIDC, returns `id_token` |
| `fhirUser` | Adds FHIR user identity to `id_token` (Patient or Practitioner ref) |
| `offline_access` | Issues a refresh token |
| `online_access` | Refresh token valid only while user has an active session |
| `launch` | Standalone launch context (rarely needed) |
| `launch/patient` | Patient context selector for standalone apps |
| `patient/*.read` | Read all resources for the in-context patient |
| `patient/*.rs` | Read + search for the in-context patient (`.rs` = read/search) |
| `user/*.read` | Read for the user's authorized patients (still fixed-patient-context — see quirks) |
| `user/*.rs` | Read/search for the user's authorized patients |
| `patient/{Resource}.read` | Resource-scoped (e.g. `patient/Patient.read`, `patient/Observation.rs`) |

Per-resource scopes are supported for all 23 USCDI v3 resources: `AllergyIntolerance, CarePlan, CareTeam, Condition, Coverage, Device, DiagnosticReport, DocumentReference, Encounter, Goal, Immunization, Location, MedicationDispense, MedicationRequest, Observation, Organization, Patient, Practitioner, Procedure, Provenance, RelatedPerson, ServiceRequest, Specimen` (the last two are accepted as scopes but not yet exposed as search endpoints in the v1 OpenAPI spec).

**Important**: AdvancedMD does NOT yet fully support generic `user/*` scopes (planned end of 2025). Practically, `user/*.read` issues a token bound to a specific patient — to query a different patient you must include `_id` in the query/body and the EHR enforces ACLs.

## EHR Launch Flow

When a SMART app is launched from inside AdvancedEHR (clicking a launch link configured for the app):

1. EHR redirects user's browser to the app's `launch_url` with `?launch={token}&iss={fhir_base}` query params.
2. The request is intercepted by **Apigee**, which validates the launch context token and extracts encrypted parameters (currently only `patientId`).
3. Apigee handles any required authentication / authorization steps.
4. The browser is then redirected to the SMART app, along with OAuth tokens from the token endpoint.
5. The SMART app uses the access token to call FHIR resources; the patient context is pre-bound based on the validated launch token.

The `aud` parameter for the subsequent authorize call must match the FHIR base URL passed as `iss`.

## TLS & Security Headers

- TLS 1.2 minimum. SSL 2.0, 3.0, TLS 1.0, 1.1 are denied at the load balancer.
- Apigee adds `X-Frame-Options: deny` on all responses (prevents embedding the app in a frame).
- Bearer tokens never accepted over plain HTTP.

## Token Lifetimes (observed)

| Token | TTL |
|-------|-----|
| Authorization code | ~60 seconds |
| Access token (FHIR) | 3600 seconds (1h) |
| Refresh token (offline_access) | ~30 days, sliding |
| Refresh token (online_access only) | Session-bound — expires when user logs out |
| Bulk JWT client_assertion | 300 seconds (5m) recommended `exp` |
| Bulk access token | 3600 seconds (1h) |

## Common Errors

| HTTP | Cause | Fix |
|------|-------|-----|
| 400 `invalid_grant` | Expired/reused authorization code | Re-run the authorize flow |
| 400 `invalid_request` | Missing `code_challenge` when registration requires PKCE | Add PKCE params |
| 401 `invalid_token` | Access token expired or revoked | Refresh or re-auth |
| 403 `insufficient_scope` | Requested scope not granted at consent screen | Re-authorize with the needed scopes |
| 403 `access_denied` | User declined consent | Show a friendly retry |
| 503 from Apigee | API gateway throttled / upstream down | Retry with backoff |

See `errors.md` for full envelope shapes.
