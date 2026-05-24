# AdvancedMD — Quirks, Gotchas, Undocumented Behavior

Things that bit integrators in the wild and aren't (or weren't until recently) in AMD's public docs.

## FHIR Quirks

### `user/*` scopes are silently single-patient
The OAuth `user/*.read` scope is documented but the access token still carries an implicit patient context. To query a different patient, include `_id={otherPatientId}` and the EHR enforces ACLs. AMD has stated full multi-patient `user/*` support "by end of 2025" — verify before relying.

### Apigee 401 → 403 inconsistency
Apigee returns 401 for missing tokens but 403 for tokens with wrong scopes. The FHIR spec recommends both. AMD also returns 403 + `OperationOutcome.code = security` for some patient-ACL denials that other servers report as 404. Treat 403 and 404 with care — they can mean "wrong patient" even when ID is valid.

### `_search` POST body uses `application/x-www-form-urlencoded`, not FHIR JSON
The POST `_search` variant accepts URL-encoded form bodies (`name=Doe&birthdate=1980-01-01`), matching FHIR's spec. **Don't** send JSON — AMD will 400.

### Capability statement is per-org
`/v1/r4/{org_id}/metadata` may list a different set of supported resources than another tenant's. Don't cache CapabilityStatement globally; cache per `org_id`.

### `_count` capped silently
Server caps `_count` to a value (often 100) regardless of what you ask for. Don't assume your `_count=500` request will return 500.

### `next` link rewriting
Pagination links (`link.relation=next`) are pre-formatted with Apigee URLs. Don't strip query params; pass the entire URL through.

### `IfNoneMatch` / ETag round-trips work but with caveats
AMD honors `If-None-Match` and returns 304 when unchanged. But ETags include the FHIR version ID (`W/"v23"`) which changes on every backend write — non-clinical updates can rev the ETag without your data changing.

### MedicationDispense vs MedicationStatement
AMD exposes `MedicationDispense` but NOT `MedicationStatement` in the US Core 6.1.0 profile. If you need patient-reported medication use, you're out of luck on FHIR — go to Connect API `getPatientNotes`.

### Provenance support is shallow
`Provenance` resources return basic agent + recorded info but typically lack `signature`, `policy`, and `entity.what` references. Don't depend on Provenance for legal-audit-grade trails.

### CapabilityStatement says SMART v2.0 but supports some v2.2 features
AMD's CapabilityStatement advertises SMART App Launch v2.0 but the implementation includes some v2.2-only features (e.g., `launch/encounter` scope, granular finegrained scopes like `Observation.read?category=laboratory`). Don't trust the version label — feature-detect from the metadata's `smartConfiguration` resource.

## Bulk API Quirks

### `prefer: respond-async` is **case-sensitive on header value**
Apigee rejects `Prefer: Respond-Async` with 415. Always lowercase the value.

### One bulk export at a time per app
AMD queues `$export` requests per client_id. A second `$export` while one is running returns 429 with `OperationOutcome.code = throttled`. Wait for the first to finish (or DELETE its status URL).

### Status URL is signed; don't re-derive it
The `Content-Location` header on the 202 response is the only valid poll URL. Don't construct `/v1/fhir-bulk/status?jobId=...` yourself — the Apigee signature is baked into a query param.

### NDJSON file URLs expire
Manifest output URLs expire after 24 hours. Download promptly or re-export.

### `_typeFilter` accepts FHIR search params
You can scope an export with `_typeFilter=Patient?_lastUpdated=gt2024-01-01,Encounter?status=in-progress`. Each filter is a FHIR search expression. Commas separate types.

### `_outputFormat` is fixed
Only `application/fhir+ndjson` is supported. Don't try `application/fhir+json` or `application/fhir+xml`.

### Empty cohort returns 200 with empty `output` array
A successful export with no matches returns:
```json
{ "transactionTime": "...", "request": "...", "output": [], "error": [] }
```
Not 404. Always check `output.length`.

## OAuth Quirks

### `aud` is checked strictly
The `aud` param on `/authorize` must match the FHIR base URL **including** `/v1/r4/{org_id}`. Trailing slash matters. A mismatch returns `invalid_request` at authorize-time, before redirect.

### `state` is mandatory at AMD even though OAuth spec says "recommended"
Omitting `state` returns 400. Always include a CSRF token.

### Authorization codes expire in ~60 seconds
Tight — exchange immediately on redirect. Don't queue.

### Refresh tokens rotate on each use
Each refresh call may return a new `refresh_token`. Discard the old one and use the new. If AMD doesn't return one, the old still works (but treat that as the exception).

### `offline_access` + `online_access` together
Including both scopes is undefined behavior — AMD's docs don't address it. Empirically, `offline_access` wins (you get a real refresh token). Pick one.

### PKCE plain is rejected silently
The spec allows `code_challenge_method=plain` but AMD only accepts `S256`. Sending `plain` returns `invalid_request` without explaining.

### Client secret is OPTIONAL with PKCE
A confidential client with PKCE can omit the `Authorization: Basic` header on token exchange. Useful for SPAs hosted as confidential clients on a backend — but match your AMD app registration's "public" vs "confidential" type.

## Connect API Quirks

### XML-RPC content-type detection breaks
Most XML-RPC libraries set `Content-Type: text/xml; charset=utf-8`. AMD's parser rejects the `; charset=utf-8` suffix on some endpoints — strip it.

### Action and class are case-sensitive
`<ppmdmsg action="GetPatients" .../>` returns "unknown action". Use lowercase: `getpatients`. Same for `class`.

### Username/password can be in any case but case-preserved on validation
Send exactly the casing AMD provisioned. `BOBSMITH` may not match `bobsmith` depending on the tenant.

### "Office key" vs "OfficeKey"
The attribute name is `officekey` (one word, lowercase) in XML-RPC, but the header in the FHIR Bulk API is `OfficeKey` (camelCase). Don't mix them.

### `findpatient` returns 200 OK even when no match
On zero matches you get `<ppmdresult success="1"><results></results></ppmdresult>` — empty results, not 404. Always check `results.patientinfo` (may be missing entirely, a single object, or an array).

### `getpatients` defaults to 500 max
Pass `maxItems` explicitly if you need a different cap. The default applies silently.

### `createPatient` duplicate-detection is fuzzy
Name + DOB collisions trigger errorcode 9 even on slight name differences (e.g., "Robert" vs "Bob"). Pass `force="true"` to bypass — only if you've verified manually.

### `force="true"` overrides most validation
Use sparingly. Once forced, AMD won't warn you later about the duplicate.

### Date formats are NOT consistent across operations
- `dob` → `MM/DD/YYYY`
- `startdatetime` (appointment) → `YYYY-MM-DDTHH:MM:SS`
- `submittedDate` (intake) → `YYYY-MM-DDTHH:MM:SS.sssZ` (with TZ)
- `datechanged` (delta sync) → varies per op; check the docs packet

Always check the per-op spec.

### `hipaarelationship` is dynamic
After picking a `relationship` (e.g., `spouse`), call `getHippaRelationships` (yes, single 'p') to get the valid HIPAA relationship options. The list changes per AMD release.

### ID prefixes vs integer IDs
Connect API responses use prefixed IDs (`pat1234`, `prov4567`). Most write operations accept the prefixed string. **Some newer REST endpoints want the integer with the prefix stripped**. Inspect each op's spec.

### Error code `0` doesn't always mean auth
`errorcode=0` is "auth failure" usually but is also returned for some internal-server transient issues. If you're confident in your creds, retry once before alarming.

### `chart="AUTO"` for auto-assigned chart numbers
Pass `chart="AUTO"` on `createPatient` and AMD generates a unique chart. Useful when you don't care about the chart format.

### Sandbox vs production scope drift
AMD's sandbox may expose operations that aren't yet GA in production (and vice versa for deprecated ops). Test against both.

## Apigee Gateway Quirks

### No backend visibility
You can't tell whether an error came from Apigee or the upstream FHIR/Connect server unless you parse the response envelope (`faultstring` → Apigee, `OperationOutcome` → upstream).

### `X-Request-Id` not always set
On Apigee policy-rejected requests (rate limit, auth) the `X-Request-Id` may be absent. Generate your own correlation ID and pass it as `X-Correlation-Id` on every request — Apigee preserves it.

### Quota windows are rolling
Apigee uses sliding windows for quotas (typical 1-minute rolling). You can be 429'd even if your average rate is below the limit, if you bursted.

### 502 from Apigee on cold-start
First request after a long idle (>15min) can 502. Retry once.

## Practical Mitigations

1. **Always feature-detect** from `CapabilityStatement` / `.well-known/smart-configuration` before relying on a scope or resource.
2. **Cache token TTLs minus 60 seconds** to avoid mid-flight expiry.
3. **Log `OperationOutcome.diagnostics` and `X-Request-Id`** on every error — InterOps needs them.
4. **Use `X-Correlation-Id`** on every outbound request for your own traceability.
5. **Respect `Retry-After`** without exception.
6. **Re-export bulk data instead of caching beyond 24 hours.**
7. **Don't conflate 403 and 404** in patient-context flows — both mean "no access" for different reasons.

## See Also

- Error envelopes: `references/errors.md`
- Working retry code: `references/examples.md`
- Versioning and behavior changes: `references/versioning.md`
