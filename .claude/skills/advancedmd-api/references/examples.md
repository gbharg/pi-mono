# AdvancedMD — Worked Examples

End-to-end recipes for each of the three API surfaces. All examples assume credentials sourced from environment variables; never hard-code.

## FHIR Single — Authorization Code + PKCE (TypeScript)

```ts
import crypto from "node:crypto";

const AMD_OAUTH = "https://providerapi.advancedmd.com/v1/oauth2";
const ORG_ID   = process.env.AMD_ORG_ID!;
const CLIENT   = process.env.AMD_CLIENT_ID!;
const SECRET   = process.env.AMD_CLIENT_SECRET!;
const REDIRECT = process.env.AMD_REDIRECT_URI!;

function pkce() {
  const verifier  = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

// Step 1 — build the /authorize URL the user visits
export function authorizeUrl(state: string, { challenge }: { challenge: string }) {
  const u = new URL(`${AMD_OAUTH}/authorize`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", CLIENT);
  u.searchParams.set("redirect_uri", REDIRECT);
  u.searchParams.set("scope", "openid fhirUser offline_access patient/*.read");
  u.searchParams.set("state", state);
  u.searchParams.set("aud", `https://providerapi.advancedmd.com/v1/r4/${ORG_ID}`);
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

// Step 2 — exchange the code for tokens (after browser redirect)
export async function exchangeCode(code: string, verifier: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT,
    code_verifier: verifier,
  });
  const r = await fetch(`${AMD_OAUTH}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT}:${SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!r.ok) throw new Error(`token exchange failed: ${r.status} ${await r.text()}`);
  return r.json() as Promise<{
    access_token: string; token_type: "Bearer"; expires_in: number;
    refresh_token?: string; id_token?: string; patient?: string;
  }>;
}

// Step 3 — call FHIR
export async function getPatient(accessToken: string, patientId: string) {
  const r = await fetch(
    `https://providerapi.advancedmd.com/v1/r4/${ORG_ID}/Patient/${patientId}`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/fhir+json" } },
  );
  if (r.status === 401) throw new TokenExpired();
  if (!r.ok) throw new Error(`patient fetch failed: ${r.status}`);
  return r.json();
}

class TokenExpired extends Error {}
```

### Refresh helper

```ts
export async function refresh(refreshToken: string) {
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
  const r = await fetch(`${AMD_OAUTH}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT}:${SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!r.ok) throw new Error(`refresh failed: ${r.status}`);
  return r.json();
}
```

## FHIR Bulk — JWT client_credentials → $export → poll → download (TypeScript)

```ts
import { SignJWT, importPKCS8 } from "jose";
import crypto from "node:crypto";

const AMD = "https://providerapi.advancedmd.com";
const CLIENT_ID  = process.env.AMD_BULK_CLIENT_ID!;
const PRIV_PEM   = process.env.AMD_BULK_PRIVATE_PEM!;
const KID        = process.env.AMD_BULK_KID!;
const OFFICE_KEY = process.env.AMD_OFFICE_KEY!;   // tenant integer
const GROUP_ID   = process.env.AMD_GROUP_ID!;     // sandbox: 991900

async function getBulkToken() {
  const privateKey = await importPKCS8(PRIV_PEM, "RS256");
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: KID, typ: "JWT" })
    .setIssuer(CLIENT_ID)
    .setSubject(CLIENT_ID)
    .setAudience(`${AMD}/v1/oauth2/token`)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: jwt,
    scope: "system/*.read",
  });
  const r = await fetch(`${AMD}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`bulk token failed: ${r.status} ${await r.text()}`);
  return (await r.json()) as { access_token: string; expires_in: number };
}

async function kickoff(token: string) {
  const r = await fetch(`${AMD}/v1/r4/Group/${GROUP_ID}/$export`, {
    headers: {
      Authorization: `Bearer ${token}`,
      OfficeKey: OFFICE_KEY,
      prefer: "respond-async",
      Accept: "application/fhir+json",
    },
  });
  if (r.status !== 202) throw new Error(`expected 202, got ${r.status}: ${await r.text()}`);
  const contentLocation = r.headers.get("Content-Location");
  if (!contentLocation) throw new Error("missing Content-Location for poll");
  return contentLocation;
}

async function poll(statusUrl: string, token: string) {
  for (let i = 0; i < 60; i++) {                       // 60 × 5s = 5min max
    const r = await fetch(statusUrl, {
      headers: { Authorization: `Bearer ${token}`, OfficeKey: OFFICE_KEY },
    });
    if (r.status === 200) return r.json();             // done
    if (r.status === 202) {
      const progress = r.headers.get("X-Progress");
      console.log(`bulk export in progress: ${progress ?? "?"}%`);
      await new Promise((res) => setTimeout(res, 5000));
      continue;
    }
    throw new Error(`unexpected poll status: ${r.status}`);
  }
  throw new Error("bulk export timed out");
}

async function downloadAll(manifest: { output: Array<{ type: string; url: string }> }, token: string) {
  const out: Record<string, string[]> = {};
  for (const f of manifest.output) {
    const r = await fetch(f.url, {
      headers: {
        Authorization: `Bearer ${token}`,
        OfficeKey: OFFICE_KEY,
        Accept: "application/fhir+ndjson",
      },
    });
    if (!r.ok) throw new Error(`download ${f.url} failed: ${r.status}`);
    const text = await r.text();
    out[f.type] = text.trim().split("\n");
  }
  return out;
}

// Driver
async function run() {
  const { access_token } = await getBulkToken();
  const statusUrl = await kickoff(access_token);
  const manifest = await poll(statusUrl, access_token);
  const data = await downloadAll(manifest, access_token);
  console.log("got resources:", Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])));
}
run().catch((e) => { console.error(e); process.exit(1); });
```

## Connect API — XML-RPC operation (Node)

```ts
// No xmlrpc package needed — we build the envelope by hand.
// Connect API delivers XML-encoded responses; parse with xml2js or similar.

import { XMLParser } from "fast-xml-parser";

const ENDPOINT = process.env.AMD_CONNECT_URL!;      // per-tenant URL from InterOps
const USER     = process.env.AMD_CONNECT_USER!;
const PASS     = process.env.AMD_CONNECT_PASS!;
const OFFICE   = process.env.AMD_OFFICE_KEY!;

async function callConnect(action: string, klass: string, body: Record<string, unknown>) {
  // Inner ppmdmsg envelope — operation-specific
  const inner =
    `<ppmdmsg action="${action}" class="${klass}" ` +
    `username="${USER}" password="${PASS}" officekey="${OFFICE}">` +
    Object.entries(body)
      .map(([k, v]) => `<${k}>${v}</${k}>`)
      .join("") +
    `</ppmdmsg>`;

  // Outer XML-RPC envelope wraps the inner as a string param
  const xmlRpc =
    `<?xml version="1.0"?>` +
    `<methodCall><methodName>ProcessRequest</methodName>` +
    `<params><param><value><string>${escape(inner)}</string></value></param></params>` +
    `</methodCall>`;

  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: xmlRpc,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const raw = await r.text();

  // Unwrap the XML-RPC response, then parse the ppmdresult inside
  const parser = new XMLParser({ attributeNamePrefix: "@_", ignoreAttributes: false });
  const outer = parser.parse(raw);
  const inner_xml = outer.methodResponse.params.param.value.string;
  const result = parser.parse(inner_xml).ppmdresult;
  if (result["@_success"] !== "1") {
    const errMsg = result.Error?.errormsg ?? "unknown error";
    throw new Error(`Connect API error: ${errMsg}`);
  }
  return result.results;
}

function escape(s: string) {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c] as string));
}

// Example — find a patient
const result = await callConnect("findpatient", "pat", {
  first: "John",
  last: "Doe",
  dob: "01/01/1980",
  exactmatch: "true",
});
console.log(result.patientinfo); // single patient or array
```

## curl recipes

### FHIR — fetch Patient bundle

```sh
curl -sS \
  -H "Authorization: Bearer $AMD_ACCESS_TOKEN" \
  -H "Accept: application/fhir+json" \
  "https://providerapi.advancedmd.com/v1/r4/$ORG_ID/Patient?name=Smith&_count=20"
```

### FHIR — kick off Bulk export

```sh
curl -sS -i \
  -H "Authorization: Bearer $BULK_TOKEN" \
  -H "OfficeKey: 991900" \
  -H "prefer: respond-async" \
  "https://providerapi.advancedmd.com/v1/r4/Group/991900/\$export"
# expect 202 + Content-Location header
```

### Connect API — getProviders (full request)

```sh
PPMD='<ppmdmsg action="getproviders" class="prov" username="'"$AMD_CONNECT_USER"'" password="'"$AMD_CONNECT_PASS"'" officekey="'"$AMD_OFFICE_KEY"'"></ppmdmsg>'

curl -sS -X POST \
  -H "Content-Type: text/xml" \
  --data-binary @- \
  "$AMD_CONNECT_URL" <<EOF
<?xml version="1.0"?>
<methodCall>
  <methodName>ProcessRequest</methodName>
  <params><param><value><string>$(printf '%s' "$PPMD" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')</string></value></param></params>
</methodCall>
EOF
```

## Common patterns

### Polling a Bulk export with cancellation

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 10 * 60_000);    // hard cap: 10 min

try {
  const manifest = await poll(statusUrl, token, controller.signal);
  // ...
} catch (e) {
  if (controller.signal.aborted) {
    await fetch(statusUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, OfficeKey: OFFICE_KEY },
    });
  }
  throw e;
}
```

### Refreshing 401 transparently

```ts
async function withRefresh<T>(fn: (token: string) => Promise<T>, tokens: TokenStore) {
  try { return await fn(tokens.access); }
  catch (e) {
    if (e instanceof TokenExpired) {
      const { access_token, refresh_token } = await refresh(tokens.refresh);
      tokens.access = access_token;
      if (refresh_token) tokens.refresh = refresh_token;
      return await fn(tokens.access);
    }
    throw e;
  }
}
```

### Delta-sync loop (Connect API)

```ts
async function syncLoop(lastSync: Date) {
  while (true) {
    const now = new Date();
    const fmt = (d: Date) => `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
    const patients = await callConnect("getnewandmodifiedpatients", "pat", {
      datechanged: fmt(lastSync),
    });
    await upsertPatientsToDb(patients);
    lastSync = now;
    await new Promise((r) => setTimeout(r, 5 * 60_000));  // 5min cadence
  }
}
```

## See Also

- Auth fields per surface: `references/auth.md`
- Endpoint catalog: `references/fhir-single-api.md`, `references/fhir-bulk-api.md`, `references/connect-api.md`
- Error shapes & retry strategies: `references/errors.md`
