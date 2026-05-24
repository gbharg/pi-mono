# AdvancedMD — Service Map

Base URLs, sandbox vs production, and where to file support tickets for each API tier.

## Production API hosts

| Surface | Host | Notes |
|---------|------|-------|
| FHIR Single + Bulk (Apigee gateway) | `https://providerapi.advancedmd.com` | Fronts both regulatory FHIR surfaces. Auth, FHIR resource paths, and capability statements live here. |
| FHIR Developer Portal | `https://fhir.advancedmd.com` | Public docs, app registration, API keys dashboard, test data downloads. Self-serve sign-in. |
| AdvancedMD Customer App | `https://app.advancedmd.com` | The end-user EHR/PM web app. SMART apps may be launched from inside. |
| Patient Portal | `https://patients.advancedmd.com` | Patient-facing portal. Patients log in here; their OfficeKey is the same one Bulk API tenants use. |
| Marketing + InterOps | `https://www.advancedmd.com` | API connection request, support form, product brochures, certification info. |
| Developer Portal (legacy) | `https://developer.advancedmd.com` | Currently returns "Site under maintenance" as of 2026-05-23. Was the Connect API docs portal. |
| Developer Portal (alt) | `https://devportal.advancedmd.com` | Alternate Connect API portal. Also under maintenance during this writing. |

All hosts require TLS 1.2+. Apigee enforces `X-Frame-Options: deny` and strips `Server` headers.

## Sandbox / test environments

| Surface | How to access |
|---------|---------------|
| FHIR Single sandbox | Self-serve. Register app at `https://fhir.advancedmd.com`, request **FHIR Single Patient API** product, file an InterOps "Have a FHIR Question" ticket to get sandbox bucket activated, then use `client_id`/`client_secret` from the app dashboard. The sandbox bucket includes test patients (see Test Data below). |
| FHIR Bulk sandbox | Same flow, but request **FHIR Bulk API** product (one product per app — DO NOT request both). Submit your JWKS URL to InterOps. Sandbox returns the `Anderson Family` cohort (~30 patients). |
| Connect API sandbox | Not self-serve. Submit https://www.advancedmd.com/api-connection-request/, sign Certified API Developer Agreement, and AMD InterOps issues sandbox `OfficeKey` + credentials + docs packet (typical SLA: 24 hours per Healthjump integration notes). |

The FHIR sandbox uses **the same Apigee gateway as production** — there's no separate `*.sandbox.advancedmd.com` host. Differentiation is by `org_id`/`OfficeKey` and the credentials handed out for non-prod apps.

## Test data (FHIR Single + Bulk sandboxes)

| Key | OrgID / GroupID | Patients |
|-----|-----------------|----------|
| Test Key 1 | `991900` | John Doe, Jane Doe, Anderson family (~30) |
| Test Key 2 | `991901` | Sample provider + procedural data |

Pulled from `fhir.advancedmd.com → Test Data`. Patient IDs are stable within the bucket.

## Support contacts

| Need | Channel |
|------|---------|
| FHIR app approval, sandbox activation, JWKS submission, Bulk API tier | InterOps ticket at https://www.advancedmd.com/support/interoperability/ — pick "Have a FHIR Question". Reference your app name. |
| Connect API onboarding (partner agreement) | https://www.advancedmd.com/api-connection-request/ |
| Existing AMD customer / EHR issue | In-app Support tab inside `app.advancedmd.com` |
| Patient Portal issue | https://patients.advancedmd.com → Help |
| Developer portal status | Implicit — no status page. Monitor https://developer.advancedmd.com |

There is **no public status page**. Outages are communicated via in-app banners and customer email.

## Apigee + WAF

All FHIR traffic is fronted by **Apigee Edge**. This affects:

- **Rate limits**: enforced at the Apigee tier, not the upstream FHIR server. 429s carry `X-RateLimit-Remaining: 0` header.
- **Auth**: token validation and scope enforcement happen at Apigee. Upstream sees an internal token.
- **TLS**: terminated at Apigee, re-established to backends.
- **Response headers**: Apigee adds `X-Apigee-Region`, `X-Apigee-Latency` for debug.
- **Throttling vs Quota**: Apigee uses both. Throttle = burst limit; Quota = sustained rate over a window. 503 may indicate a quota miss; retry with jitter.

For published Apigee defaults AMD has not stated rate limits in public docs. Empirically (per integration shops): ~5–10 req/s per client_id, with bursts to 20. Bulk export starts queue 1 per app at a time.

## DNS / IP allowlisting

If you need to allowlist outbound IPs:
- `providerapi.advancedmd.com` resolves to Apigee Edge IPs (Google-managed, varies regionally).
- `fhir.advancedmd.com` resolves to AWS CloudFront (varies).

AMD does **not** publish stable IP ranges for the Apigee gateway. For partner Connect API URLs (per-tenant), the IPs are typically stable and provided in the onboarding packet.

## OAuth / FHIR discovery endpoints

```
GET /v1/r4/{org_id}/metadata         → FHIR CapabilityStatement (R4)
GET /.well-known/smart-configuration  → SMART metadata (may be served per-org)
```

The `CapabilityStatement` advertises supported resources, search params, interactions (search, read), and SMART scopes. Pull it once and cache.

## Custom subdomains for partner apps

If AMD onboards your app, they may issue a `*.connect.advancedmd.com` subdomain for partner-launched SMART apps so launch flows can be tracked. This is communicated per-partner.

## See Also

- Auth flows (per surface): `references/auth.md`
- FHIR Single endpoints: `references/fhir-single-api.md`
- FHIR Bulk endpoints: `references/fhir-bulk-api.md`
- Connect API surface: `references/connect-api.md`
- Versioning + deprecation: `references/versioning.md`
- Quirks (Apigee-related and AMD-specific): `references/quirks.md`
