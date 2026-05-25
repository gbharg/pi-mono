# FHIR Bulk Data Export API

Reverse-engineered from `data/openapi-bulk-r4.yaml`.

- **Spec title**: FHIR Bulk API (HealthAPIx OAuth v2.0 API Specs for Backend Services Token Generation and Bulk Data Export Procedure)
- **OpenAPI version**: 3.0.1
- **Base URL**: `https://providerapi.advancedmd.com`
- **Standard**: HL7 SMART Backend Services Authorization + FHIR Bulk Data Access ($export)
- **Auth**: client_credentials with JWT bearer assertion (SMART Backend Services)
- **Use cases**: population health, analytics, EHR-to-EHR data migration, research

The Bulk API exports data for a `Group` resource (i.e., a defined cohort of patients) as NDJSON files asynchronously.

## All Endpoints (5 total)

| Method | Path | Tag |
|--------|------|-----|
| POST | `/v1/oauth2/token` | Obtain Access Token |
| GET | `/v1/r4/Group/{groupId}/$export` | Start Bulk Data Export |
| GET | `/v1/fhir-bulk/status` | Check Data Export Status |
| DELETE | `/v1/fhir-bulk/status` | Cancel Bulk Data Export |
| GET | `/v1/fhir-bulk/fhir-resource/{batchId}/{fhirEntity}` | Get FHIR Entity (NDJSON download) |

## Step 1 — Obtain Access Token

```http
POST /v1/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion={signed_jwt}
&scope=system/*.read
```

Request body fields:

| Field | Required | Notes |
|-------|----------|-------|
| `grant_type` | yes | Fixed: `client_credentials` |
| `client_assertion_type` | yes | Fixed: `urn:ietf:params:oauth:client-assertion-type:jwt-bearer` |
| `client_assertion` | yes | Signed JWT — see Auth doc |
| `scope` | yes | Typically `system/*.read` |
| `username` | optional | Some integration patterns include the partner's username |
| `password` | optional | Partner password (sandbox flows) |
| `officekey` | optional | Tenant OfficeKey (integer) |

The optional `username`/`password`/`officekey` triple is present in the spec for some integration variants — production Bulk apps with JWKS-based JWT do not need them.

Response 200:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "system/*.read"
}
```

Errors → `Error400oAuth2` (`{ error, error_description }`).

## Step 2 — Kick Off Export

```http
GET /v1/r4/Group/{groupId}/$export?_type=Patient,CareTeam&_since=2019-10-25T11:14:00Z
Authorization: Bearer {access_token}
OfficeKey: 991900
prefer: respond-async
```

Headers:

| Header | Required | Notes |
|--------|----------|-------|
| `Authorization` | yes | Bearer token from step 1 |
| `OfficeKey` | yes | Integer — identifies tenant |
| `prefer` | yes | Must be `respond-async` |

Query params:

| Param | Notes |
|-------|-------|
| `_type` | Comma-separated FHIR resource types to include. Absent = all authorized types. Example: `Patient,CareTeam`. |
| `_since` | ISO-8601 UTC datetime. Only resources `lastUpdated` after this are included. |

Path params:

| Param | Notes |
|-------|-------|
| `groupId` | Integer ID of the Group resource (`991900` and `991901` are sandbox groups). |

Response 202 Accepted:
```json
{
  "status": "in-progress",
  "groupId": 991900,
  "jobId": 3739
}
```

Save the `jobId` and `groupId` — you need them to poll status.

## Step 3 — Poll Status

```http
GET /v1/fhir-bulk/status?groupId=991900&jobId=3739
Authorization: Bearer {access_token}
OfficeKey: 991900
```

Responses:

### 202 — Still running

```json
{
  "status": "in-progress"
}
```

Keep polling. Use exponential backoff starting at ~30 seconds. Big groups (10k+ patients) can take 10+ minutes.

### 200 — Done

```json
{
  "transactionTime": "2026-05-23T14:30:00Z",
  "request": "https://providerapi.advancedmd.com/v1/r4/Group/991900/$export",
  "requiresAccessToken": true,
  "output": [
    { "type": "Patient", "url": "https://providerapi.advancedmd.com/v1/fhir-bulk/fhir-resource/abc-123/Patient" },
    { "type": "Observation", "url": "https://providerapi.advancedmd.com/v1/fhir-bulk/fhir-resource/abc-123/Observation" }
  ],
  "error": []
}
```

`output[].url` is a download URL for an NDJSON file (one FHIR resource per line). `error[]` lists OperationOutcomes for resources that failed.

### 403 / 500 — Job in bad state

Returns `OperationOutcomeWithID` with the failed `jobId`. Cancel and restart.

## Step 4 — Download NDJSON

```http
GET /v1/fhir-bulk/fhir-resource/{batchId}/{fhirEntity}
Authorization: Bearer {access_token}
OfficeKey: 991900
```

| Param | Notes |
|-------|-------|
| `batchId` | UUID extracted from the `output[].url` |
| `fhirEntity` | Resource type name (`Patient`, `Observation`, etc.) |

Returns content-type `application/fhir+ndjson` — one full FHIR resource per line, no Bundle envelope.

## Step 5 — Cancel (optional)

```http
DELETE /v1/fhir-bulk/status?groupId=991900&jobId=3739
Authorization: Bearer {access_token}
OfficeKey: 991900
```

Response 202: `{ "status": "canceled", "groupId": 991900, "jobId": 3739 }`.

## Schemas (full list from spec)

- `Token` — access token response
- `ExportInfo` — `{ status, groupId, jobId }` (202 from $export)
- `ExportStatus` — `{ status }` (202 from /status while in progress)
- `ExportIsReady` — full output manifest (200 from /status when done)
- `ExportIsCanceled` — `{ status, groupId, jobId }` (202 from DELETE)
- `ExportFhirEntity` — single NDJSON line shape (resourceType + meta + code + status)
- `OperationOutcome` — FHIR error envelope (text, issue[])
- `OperationOutcomeWithID` — adds jobId to OperationOutcome
- `Error400oAuth2` — `{ error, error_description }`

See `data/openapi-bulk-r4.yaml` for the complete spec.

## Quirks & Gotchas

- **OfficeKey is mandatory on every Bulk call**, not just $export — `/status`, `/fhir-bulk/fhir-resource/*` all need it.
- **`prefer: respond-async` is mandatory** on $export. Without it the gateway rejects.
- **`requiresAccessToken: true`** in the manifest means the download URLs still need `Authorization: Bearer`. AdvancedMD does not pre-sign download URLs.
- **One product per Bulk app.** When registering, request ONLY `FHIR Bulk API` — do not also request Single. InterOps will deny multi-product apps.
- **JWKS hosting** is your responsibility. Use a static endpoint (S3 + CloudFront works). AMD does not host your keys.
- **Test groups** in sandbox are `991900` and `991901` — both contain the same Anderson family test cohort.
- **Status 503** = Apigee throttled or upstream temporarily unavailable. Retry with longer backoff. Big exports can briefly stall the gateway.
- **No webhooks** — Bulk export is pull-only. Poll until done, then download.
- **JWT exp ≤ 5 minutes** is recommended. Reuse the same `client_assertion` JWT only within its `exp`.

## Sample Bulk Worker Loop (TypeScript)

```ts
const tok = await getBulkToken(jwt);
const start = await fetch(`https://providerapi.advancedmd.com/v1/r4/Group/${groupId}/$export?_type=${types}`, {
  headers: { Authorization: `Bearer ${tok}`, OfficeKey: String(officeKey), prefer: 'respond-async' },
});
const { jobId } = await start.json();

let manifest: any;
for (let backoff = 30_000; ; backoff = Math.min(backoff * 1.5, 300_000)) {
  await new Promise(r => setTimeout(r, backoff));
  const s = await fetch(`https://providerapi.advancedmd.com/v1/fhir-bulk/status?groupId=${groupId}&jobId=${jobId}`, {
    headers: { Authorization: `Bearer ${tok}`, OfficeKey: String(officeKey) },
  });
  if (s.status === 200) { manifest = await s.json(); break; }
  if (s.status >= 400) throw new Error(`status ${s.status}`);
}

for (const file of manifest.output) {
  const r = await fetch(file.url, { headers: { Authorization: `Bearer ${tok}`, OfficeKey: String(officeKey) } });
  // r.body is application/fhir+ndjson — process line by line
}
```
