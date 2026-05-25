# AdvancedMD — Errors

Three distinct error envelopes, one per surface. Recognize the shape before debugging.

## 1. FHIR (Single + Bulk) — `OperationOutcome`

Every FHIR error returns the standard FHIR `OperationOutcome` resource. Apigee adds an HTTP status; the body explains.

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "not-found",
      "details": {
        "text": "Patient/12345 does not exist or is not accessible with this token."
      },
      "diagnostics": "req-id 1f8a2b...",
      "expression": ["Patient/12345"]
    }
  ]
}
```

Fields:
- `severity`: `fatal | error | warning | information`
- `code`: a FHIR-defined enum. Common values: `not-found`, `forbidden`, `security`, `processing`, `invalid`, `value`, `required`, `not-supported`, `business-rule`, `throttled`, `transient`, `timeout`, `informational`.
- `details.text`: human-readable.
- `diagnostics`: typically includes an internal request ID. **Always log this** — InterOps will ask for it.
- `expression`: FHIRPath pointer to the offending element.

### Common FHIR HTTP statuses

| HTTP | `code` | Cause | Action |
|------|--------|-------|--------|
| 400 | `invalid` / `value` | Malformed search params, bad date format | Validate against CapabilityStatement |
| 401 | `security` | Missing / expired bearer token | Refresh and retry |
| 403 | `forbidden` / `security` | Scope insufficient or patient ACL blocks access | Re-authorize with correct scopes |
| 404 | `not-found` | Resource ID doesn't exist in this tenant | Verify org_id + resource ID |
| 406 | `not-supported` | Wrong `Accept` header | Use `application/fhir+json` |
| 409 | `business-rule` | Conflict (rare on read) | Inspect issue text |
| 410 | `not-found` | Resource deleted (FHIR R4 logical-delete) | Treat as 404 unless using history |
| 422 | `business-rule` | Bulk: $export request rejected by policy | Review group + scope |
| 429 | `throttled` | Rate limit hit | Back off + retry per `Retry-After` |
| 500 | `processing` / `exception` | Apigee or upstream error | Capture `diagnostics`, retry once, file InterOps if persistent |
| 503 | `transient` | Apigee quota or upstream offline | Retry with exponential backoff |

## 2. OAuth 2.0 / SMART — RFC 6749 envelope

OAuth errors at `/v1/oauth2/token` follow the OAuth spec exactly:

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code expired or already redeemed.",
  "error_uri": "https://fhir.advancedmd.com/docs/errors#invalid_grant"
}
```

Standard `error` values:

| Error | HTTP | Cause |
|-------|------|-------|
| `invalid_request` | 400 | Missing or malformed parameter |
| `invalid_client` | 401 | client_id/secret bad, or Basic auth missing |
| `invalid_grant` | 400 | Code expired (~60s), reused, or grant invalid |
| `unauthorized_client` | 400 | Grant type not enabled for this client |
| `unsupported_grant_type` | 400 | Grant type not recognized (e.g. asking for password grant) |
| `invalid_scope` | 400 | Scope not registered with the app |
| `access_denied` | 400 | User declined consent on `/authorize` |
| `server_error` | 500 | Apigee or token endpoint failure |
| `temporarily_unavailable` | 503 | Retry |

For PKCE: missing `code_verifier` returns `invalid_grant`. Wrong `code_verifier` also returns `invalid_grant` (no specific PKCE error).

For JWT client_assertion (Bulk): a malformed/expired JWT returns `invalid_client`. A signed JWT with a kid not in your JWKS returns `invalid_client` with `error_description: "JWK validation failed"`. JWT `exp` must be ≤ 5 minutes from `iat`.

## 3. Connect API — `<ppmdresult>` envelope

XML-RPC responses wrap a `<ppmdresult>` (success) or `<ppmdfault>` (error) element.

### Success

```xml
<methodResponse>
  <params><param><value><string>
    <ppmdresult success="1">
      <results>
        <patientinfo id="pat1234" chart="ABC123" first="John" last="Doe" .../>
      </results>
    </ppmdresult>
  </string></value></param></params>
</methodResponse>
```

### Error

```xml
<methodResponse>
  <params><param><value><string>
    <ppmdresult success="0">
      <Error>
        <errorcode>0</errorcode>
        <errormsg>Invalid credentials. Username, password, or officekey is wrong.</errormsg>
      </Error>
    </ppmdresult>
  </string></value></param></params>
</methodResponse>
```

### Common Connect error codes

| `errorcode` | Meaning |
|-------------|---------|
| `0` | Auth failure (creds or officekey) |
| `1` | Bad request (missing required field) |
| `2` | Validation error (data fails business rule) |
| `5` | Not found (no record matching the supplied IDs) |
| `9` | Duplicate detected (createPatient — Name+DOB or SSN collision). Re-call with `force="true"` to bypass |
| `15` | Permission denied (API user lacks rights for this op) |
| `99` | Generic server error |
| `100` | Throttle / rate limit |

The HTTP status from the Connect API is **always 200**, even on application errors — the discriminator is `ppmdresult/@success="0"`. Don't rely on HTTP code; parse the envelope.

### Connect API REST flavor (newer)

When using the REST surface (post-OAuth tokens) the error envelope follows JSON conventions:

```json
{
  "error": {
    "code": "DUPLICATE_PATIENT",
    "message": "Name + DOB collision",
    "field": "first,last,dob",
    "request_id": "req_8a2..."
  }
}
```

Status code matches the error class (400/401/403/404/409/500). `request_id` is required when filing tickets.

## Apigee 4xx/5xx — when it isn't your API

Apigee can short-circuit a request before it reaches AMD. These responses lack a normal envelope:

```json
{
  "fault": {
    "faultstring": "Rate limit exceeded",
    "detail": { "errorcode": "policies.ratelimit.QuotaViolation" }
  }
}
```

Recognize by:
- `faultstring` + `detail.errorcode` structure (not the OperationOutcome shape).
- `errorcode` namespace: `policies.*` = Apigee policy failure; `messaging.adaptors.*` = backend adaptor; `oauth.v2.*` = OAuth policy.

Treat as opaque transport-layer errors — retry with backoff. If `errorcode` is `policies.ratelimit.*`, honor `Retry-After`.

## Retry strategy

| Error | Retry? | Strategy |
|-------|--------|----------|
| 401 (bearer expired) | yes, once | Refresh token, then retry |
| 403 | no | Fix scopes / ACLs |
| 404 | no | Don't retry not-found |
| 422 | no | Fix request |
| 429 | yes | Honor `Retry-After`, exponential jitter (base 500ms × 2^n + rand) |
| 500 | yes, capped | 1–2 retries with exponential jitter |
| 503 | yes | Exponential backoff up to 30s |
| Network / TLS error | yes | Up to 3 retries with backoff |

Total retry budget: ≤ 30s per request. Beyond that, surface to the caller.

## Logging recommendations

For every failure, log:
1. HTTP status
2. `OperationOutcome.issue[0].diagnostics` (FHIR), `error_description` (OAuth), or `<errormsg>` (Connect)
3. Request ID — from response headers (`X-Request-Id`, `X-Apigee-Region`, or the diagnostics field)
4. Endpoint + method (NOT the full request body — may contain PHI)

Redact:
- PHI in request bodies
- Bearer tokens (log token claims only after decoding ID token, never the JWT itself)
- Patient identifiers in error messages when forwarded to users

## See Also

- Status codes per endpoint: `references/fhir-single-api.md`, `references/fhir-bulk-api.md`
- Auth-specific errors: `references/auth.md`
- Working retry examples: `references/examples.md`
