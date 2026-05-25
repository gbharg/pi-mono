# Curogram Service Map

The Curogram backend is split across multiple subdomains. Send each request to the right host or you'll get a 404.

## Web app

| Subdomain | What it is |
|---|---|
| `app.curogram.com` | Angular SPA (the dashboard the practice staff uses) |
| `curogram.com` | Marketing site |

The SPA bundle (`main.b44a600408df199f.js`, ~6.7 MB) contains all the GraphQL queries and the `apiUrl()` helper that constructs every REST URL.

## API hosts (observed in active session)

| Host | Purpose | Style |
|---|---|---|
| `api-v2.curogram.com` | Main API. Most REST + the primary GraphQL endpoint. | REST + GraphQL |
| `patients.curogram.com` | Patients-microservice GraphQL — currently used for `communicationPreferences`. | GraphQL only |
| `practices.curogram.com` | Practices-microservice GraphQL — currently used for `additionalFunctionalityEnabled`. | GraphQL only |

## API hosts (referenced in source, not exercised this session)

These appear as string literals in the Angular bundle but were not hit during the dashboard session. They are documented for completeness — verify shape/path empirically before depending on them.

| Host | Likely role |
|---|---|
| `authentication.curogram.com` | Auth microservice |
| `cp.curogram.com` | Control panel / admin |
| `curation.curogram.com` | Content curation |
| `emails.curogram.com` | Outbound email gateway |
| `patient-statements.curogram.com` | Statement generation |
| `reports.curogram.com` | Analytics / report rendering |
| `stack.curogram.com` | Backend stack info / health |
| `storage.curogram.com` | File uploads (attachments, avatars) |
| `voip.curogram.com` | Voice / VoIP signaling |

## Routing decision

When the docs in this skill reference a path without a host, default to `https://api-v2.curogram.com`. The two GraphQL-only microservices are explicitly called out where they apply (look for "lives on `patients.curogram.com`" / "`practices.curogram.com`" notes).

## Bundle URL helper convention

In source you'll see calls like:

```js
const T = _.N.api.apiUrl(`/conversations/${convId}/messages`);
this.http.post(T, { message, sendSecurely });
```

`apiUrl()` resolves to `https://api-v2.curogram.com` + the path. There are separate helpers for the GraphQL microservices — referenced as `practicesGraphQl` / `patientsGraphQl` in the bundle shape, though only the resolved hostnames were observed at runtime.

## Security headers

Every authenticated call needs:

```
X-Curogram-Frontend: web
X-XSRF-TOKEN: <value of XSRF-TOKEN cookie>
Cookie: <session cookies>
Content-Type: application/json
```

Missing `X-XSRF-TOKEN` will fail mutations.

## Realtime (socket.io)

The bundle imports `socket.io-client`. The websocket URL was not active during the idle dashboard capture. Most likely candidate: `wss://api-v2.curogram.com/socket.io/`. Confirm by opening DevTools -> Network -> WS while a conversation receives a live message.

## Telemetry / 3rd party (ignore for agent work)

- `googletagmanager.com` (GA)
- `google-analytics.com`
- Stripe (`ngx-stripe`)
- Twilio (referenced in docs, telemed video transport)
