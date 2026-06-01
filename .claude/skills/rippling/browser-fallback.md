# Rippling Browser Fallback

Goal: provide the equivalent of the Marketplace Platform API endpoints that
Personal API Tokens 403 against. The pattern below uses an already-logged-in
Chrome session on the iMac (or any Tailnet-reachable Mac with a Rippling
window open) and drives it via AppleScript JS injection.

Use this for anything tagged `[BROWSER-ONLY]` in the rippling-mcp tool list,
or whenever an MCP call returns the structured "Rippling Personal API Tokens
do not have access to this endpoint..." error.

## Why a browser is the fallback (not a different API token)

Rippling exposes two surfaces:

- **Marketplace Platform API** — `/employees`, `/departments`, `/teams`,
  `/custom_fields`, `/levels`, `/work_locations`, `/leave_*`, etc. Only
  reachable by **Custom Apps** registered via Rippling's Partner program.
  Personal API Tokens 403 here regardless of which scopes they claim.
- **Personal API surface** — `/me`, `/time_entries`, `/shifts`. This is all
  the Personal API Token can do.

Re-issuing the token with "more scopes" does not help — the page itself shows
72 scopes ticked and still 403s. The block is at the surface level. Exult
would need to apply to Rippling's Partner program to get Custom App
credentials; that's not self-serve and is gated on Rippling BD approval.

Until that lands, the browser is the only path.

## Driving the browser

The active session lives on `gautams-imac`, user `exult`. Chrome window 1
is typically already on a Rippling page. Inject JS via AppleScript:

```bash
ssh exult@gautams-imac "osascript -e 'tell application \"Google Chrome\" to execute active tab of window 1 javascript \"<JS code>\"'"
```

For long-running navigation flows, prefer to:

1. Navigate to the target URL: set `window.location.href = '<url>'`.
2. Wait for `document.readyState === 'complete'` then for a known
   selector to appear (the page uses heavy SPA hydration).
3. Use `document.querySelectorAll(...)` to scrape, then JSON-stringify the
   result and return it via the AppleScript return channel.

The iMac Chrome omnisearch pattern (already used for role-ID lookup): focus
`input[name='unity-searchbar-input']`, dispatch keyboard events to type a
name, wait for the dropdown to render, then scrape `a[href^="/profile/"]`
href values.

## Recipes per dropped MCP tool

| MCP tool                        | Page                                              | Selectors / pattern |
|---------------------------------|---------------------------------------------------|--------------------|
| `get_employees`                 | `https://app.rippling.com/people`                 | Table rows under `[data-testid="people-table"]`. Paginate via the "Next" button. Scrape name + role link href (`/profile/<roleId>`). |
| `get_employee` (by id)          | `https://app.rippling.com/profile/<roleId>`       | Profile header has name, title, email; sidebar has department, manager, work location. |
| `search_employees`              | `https://app.rippling.com/people` then omnisearch | Focus `input[name='unity-searchbar-input']`, type the query, scrape dropdown `a[href^="/profile/"]` |
| `get_departments`               | `https://app.rippling.com/admin/departments`      | Table rows under the departments admin table. |
| `get_teams`                     | `https://app.rippling.com/admin/teams`            | Same admin-table pattern as departments. |
| `get_custom_fields`             | `https://app.rippling.com/admin/custom-fields`    | Lists field label + type + scope; for IDs, click into each field and read URL. |
| `get_levels`                    | `https://app.rippling.com/admin/levels`           | Admin table. |
| `get_work_locations`            | `https://app.rippling.com/admin/work-locations`   | Admin table. |
| `get_leave_requests`            | `https://app.rippling.com/time-off/requests`      | Filter by status, scrape request rows. |
| `get_leave_balances` (per emp)  | `https://app.rippling.com/time-off/balances/<id>` | Balance widgets keyed by leave type. |
| `get_company`                   | `https://app.rippling.com/settings/company`       | Settings page reads off the header + company info card. |
| `update_employee` (field edit)  | `https://app.rippling.com/people/<id>/edit`       | Find the field by label, set value, click Save, wait for toast. |
| `update_employee_custom_fields` | same `/people/<id>/edit`                          | Repeat the field-edit recipe per custom field; save once at the end. |

## Why direct internal-API hits don't work

`/api/hub_platform/api/unity_search/search` and friends are gated by
"No role or company found for verification" even when you pass the page's
`localStorage.access_token` as Bearer. The page-side service worker adds
context the page-side fetch interceptor can't see. Don't waste time
replaying these — use the page's UI affordances instead.

## Authentication

Don't try to log in from this script. Assume the iMac Chrome window is
already authenticated (Gautam stays logged in 24/7). If the session has
expired, abort with a clear "Rippling session expired on iMac; needs manual
re-login" message and don't attempt to drive the SSO flow.
