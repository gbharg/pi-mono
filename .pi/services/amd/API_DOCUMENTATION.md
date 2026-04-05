# AdvancedMD API Documentation — AUTHORITATIVE SOURCE

> **This file catalogs endpoints from AMD's official published documentation.** Every entry must carry a `source_url` pointing to the specific AMD-published page that documents it. No inferred, observed, or reverse-engineered endpoints live in this file — those belong in `API_REFERENCE.md`.

## Status (2026-04-05)

**Zero endpoints cataloged. The authoritative doc tree is login-gated and the automated crawl is blocked by a popup-blocker interaction in the Playwright Chromium profile.**

## Authoritative URL

Gautam confirmed the canonical AMD API reference lives at:

- **Base**: `https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/`
- **Entry page**: `https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Introduction.htm`

This URL is also stored in the authenticated PM session — it appears as `helpurl` inside the `PPMDResults_{officeKey}_{user}` localStorage object (verified via CDP dump 2026-04-05 from a partially-authenticated session). The full path is:

```
PPMDResults > Results > usercontext > helpurl = https://ow2-help-01-prd.advancedmd.com/help/
```

## Access gating

Unauthenticated HTTP probe (2026-04-05, from this machine):

```
GET https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Introduction.htm
-> HTTP/2 302
-> Location: https://login.advancedmd.com:443/
```

The `ow2-help-01-prd` host sits behind an AWS ELB that enforces an `advancedmd.com` session cookie. Any request lacking that cookie bounces to the marketing login page. The server does NOT honor the static-100 identity-app `saml-session` cookie alone; the PM session token cookie (`token` cookie on `.advancedmd.com`, value format `{officeKey}{64-hex}`) is required.

### How to obtain a valid session cookie (procedure)

1. Navigate a browser to `https://static-100.advancedmd.com/apps/identity/#/session-timeout`.
2. Click "Back to Login" → URL becomes `https://static-100.advancedmd.com/apps/identity/#/login/{guid}`.
3. Fill `loginName` / `password` / `officeKey` inputs, select the `pm` radio, click "Log in". This POSTs to `api-100.advancedmd.com/api/singlesignon/saml/uservalidationrequests/{officeKey}/{user}` and `api-100.advancedmd.com/api/locator/defaulturls`, then `pm-api-{shard}.advancedmd.com/api/authentication/preauth/status2fa` + `send2faemail`.
4. Retrieve the 6-digit 2FA code from email (`gautambharg@gmail.com`, sender `noreply@advancedmd.com`, arrives within ~30s).
5. Submit the code — the verification button in the Material Angular form is only revealed once the input is `ng-valid` (exactly 6 digits matching `^[0-9]{6}$`). Simulate a real `keyup` + explicit `.click()` on the submit button; `form.requestSubmit()` alone does NOT dispatch the Angular submit handler.
6. On success the browser redirects to `https://static-100.advancedmd.com/apps/login/#/launch-app`. The launch-app page then calls `window.open('https://pm-wfe-{shard}.advancedmd.com/practicemanager', ...)` which, in a HEADLESS or POPUP-BLOCKED browser, triggers a modal dialog reading *"Compatibility check — Our application requires you to allow popups from advancedmd.com."* The `token` cookie is only set by the popup navigation chain — so if the popup is blocked, no session cookie is ever written.
7. Once the popup opens `pm-wfe-{shard}/practicemanager`, the server sets the session cookies: `token`, `u`, `k`, `ku`, `appid`, `launchpayloadpm`, `pmapiredirecturl`.

### Crawl blocker (2026-04-05 session)

The Playwright `/tmp/amd_fresh_profile` Chromium instance (port 62428) was launched WITHOUT popup support. The 2FA code submission succeeds (we land at `.../launch-app`) but the PM popup is silently blocked, so no `token` cookie is written, and the subsequent navigation to `ow2-help-01-prd.advancedmd.com/help/...` still 302s to login. Attempting `Page.reload` after injecting a `window.open` hook via `Page.addScriptToEvaluateOnNewDocument` only re-ran the identity app login flow (because the transient auth state had already been burned).

**To unblock**: relaunch the Playwright Chromium with `--disable-popup-blocking` OR with `--allow-popups-during-page-unload`, OR run the login flow in the bundled Playwright MCP headed Chromium (port 57877) which does not have the same policy. Alternatively, inject the `window.open` override via `Page.addScriptToEvaluateOnNewDocument` BEFORE the initial navigation to the identity app (not after, as was attempted here).

## What to do next session (when cookies are obtained)

1. Verify the `token` cookie exists at domain `.advancedmd.com` after launch-app flow completes.
2. From the same Chrome context, navigate directly to `https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Introduction.htm`. Verify the response is the real docs page (should contain a navigation `<frameset>` or a left-nav `<div class="toc">`, NOT a 302 redirect).
3. Look for a machine-readable TOC — HTML Help systems typically expose one at `.../Data/Tree.xml`, `.../Data/Toc.xml`, or `.../Resources/StandardToc.xml`. Try those paths first. Each TOC file maps page titles → `Content/*.htm` paths.
4. Crawl each `Content/*.htm` page with the captured cookie jar. Save raw HTML to `.pi/services/amd/amd-api-docs/` preserving path structure.
5. For each endpoint page, extract: HTTP method, path, query params (typically shown as `<table>` of name + type + description), request body schema, response schema, example curl/JSON. AMD help pages use a consistent template so a single BeautifulSoup parser should handle all of them.
6. Populate `api_documentation.json` with the schema shown below and regenerate this Markdown file from it.

## Schema for `api_documentation.json` (when populated)

```json
{
  "source": "AMD official API documentation",
  "source_base_url": "https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/",
  "crawled_at": "ISO8601",
  "crawled_by": "authenticated Playwright session (user gautam@161112)",
  "endpoints": [
    {
      "method": "GET",
      "path": "/...",
      "category": "patients|appointments|billing|auth|...",
      "purpose": "string",
      "source_url": "https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/<page>.htm",
      "params": {"name": {"type": "string", "required": true, "description": "..."}},
      "request_body": {},
      "response": {},
      "example": "curl -X GET ..."
    }
  ]
}
```

## Non-authoritative fallbacks tried

- `https://developer.advancedmd.com/` — public marketing, no endpoint catalog without a signed Certified API Developer Agreement.
- `https://developer.advancedmd.com/documentation/api` — returns HTTP 503 to unauthenticated clients (likely a WAF rule).
- `https://fhir.advancedmd.com/` — SPA shell only; the FHIR capability statement at `/metadata` and `/R4/metadata` returns the same SPA HTML, not FHIR JSON.

## Cross-reference

For endpoints we have actually observed or successfully called, see `API_REFERENCE.md` / `api_reference.json` in this directory. Those are NOT authoritative but they are live-verified. An entry present in `API_REFERENCE.md` should appear in THIS file after the docs crawl completes — any that do not indicate either an internal/undocumented endpoint or a deprecated one.
