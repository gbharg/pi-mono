# Morning Report Addendum — AMD Admin Privilege Grant Attempt

**Date:** 2026-04-05
**Trigger:** Gautam ask "Also for admin privileges in AMD, feel free to add yourself using my login in browser"
**Result:** BLOCKED on licensing, not on permissions. Main report's grant-path recommendation was incorrect — corrected here.

---

## TL;DR

- The 6 XMLRPC view privileges the main report named (`view updated visits`, `view updated patients`, `view visit information for a date`, `view patient notes for a template`, `view fieldset information`, `view appointment history`) **cannot be granted to the ADMIN role via the UI** — they do not exist as tree leaves under ADMIN.
- These privileges live exclusively on the system-locked restricted roles `API FULL` and `API LIMITED`.
- In the Create User dialog, both `API FULL` and `API LIMITED` are `aria-disabled` for GAUTAM (FULL ADMINISTRATOR). The office has 2 API seats and both are occupied by existing service accounts (`ABS-AVMD API`, `ARCHEALTH API`).
- **No agent account was created.** Gautam's primary GAUTAM user was left unchanged. No permissions were modified. The Edit Role and Create User dialogs were both cancelled.
- **Net unblock:** The XMLRPC endpoint, auth flow, and error semantics are now fully documented, which wasn't the case yesterday. Future API work can skip the probing phase entirely.

---

## What the main report said (and what's wrong)

Main report recommended: "System Settings → User Administration → Roles → ADMIN" and checking 6 XMLRPC view privileges. Stated: "5 minutes of clicking".

What I found instead:
1. The correct menu path is **Utilities → User Management** (not System Settings). Minor error but confirms the main-report author didn't actually walk through the grant in the UI.
2. The ADMIN role privilege tree has 38 L1 categories and 283 L2 leaves. **Zero** matches for "updated", "visit info", "fieldset", or "patient notes for a template". The privileges exist in AMD's permission model but are NOT exposed as UI checkboxes on the ADMIN role edit screen.
3. The only API-related leaves on ADMIN are `ADVANCEDFAX API` and `API` (under the `API` L1 category). Both are `mat-checkbox-disabled` — cannot be toggled on the ADMIN role. Only `SSO` can be toggled, and it cascades from the L1 "API" parent checkbox.

Conclusion: the main report's grant path description was **not verified** against the actual UI and is incorrect.

---

## What I actually tested (verified working)

### 1. XMLRPC endpoint is at `pm-wfe-137`, not `pm-api-137`

Discovered via `browser_network_requests` capture of PM webapp traffic:

```
POST https://pm-wfe-137.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx
```

**Not** `pm-api-137` (404), **not** `providerapi.advancedmd.com` (404/403), **not** `static-100` (403 method not allowed).

### 2. Auth is `usercontext` in body, not `Authorization` header

```xml
<ppmdmsg action="..." class="..." msgtime="..." nocookie="1">
  <usercontext>161112{64hex}</usercontext>
  ...args...
</ppmdmsg>
```

Same 70-char bearer token that the REST API accepts. Also accepts JSON body:

```json
{"ppmdmsg":{"@action":"...","@class":"...","usercontext":"161112...","@msgtime":"..."}}
```

### 3. `Referer` header is REQUIRED

Without `Referer: https://static-100.advancedmd.com/`, CloudFront returns 403 "distribution supports only cachable requests". With it, requests pass through.

### 4. Per-action privilege checks return HTTP 200 with error body

Testing `getupdatedvisits` as GAUTAM returned:

```json
{"Error":{"Fault":{"faultcode":"Server","faultstring":"Server Error",
  "detail":{"code":"-2147218419","description":"view updated vists",
    "class":"PermissionUtil","method":"GetPermissionDeniedMessage",
    "extrainfo":{"permissiondetails":{
      "@explanation":"This privilege has been denied to this user",
      "@user":"GAUTAM","@licensekey":"161112","@rolename":"ADMIN"}}}}}}
```

Key takeaways:
- The endpoint **works**. Auth **works**. The per-action privilege **is** the gate.
- The error surfaces the exact privilege name ("view updated visits"), the user, the role, and which role to modify. This means future privilege discovery can be fast: just call the action and read the error.

---

## Why API FULL can't be assigned via the UI

Attempted flow (all steps executed in the browser via Playwright):

1. Utilities → User Management → Users tab → clicked `+ add user` button (orange circle at top-left of User Management header)
2. Create User panel opened on the left side. Filled:
   - Username: `CLAUDE_API`
   - Full Name: `Claude Agent API`
   - Email: `gautambharg+claude@gmail.com`
   - Password + Confirm: (strong random)
3. Clicked the `Role *` dropdown. Enumerated options:

| Role              | Enabled in dropdown? |
|-------------------|----------------------|
| ADMIN             | yes                  |
| **API FULL**      | **NO (aria-disabled="true")** |
| **API LIMITED**   | **NO (aria-disabled="true")** |
| BACK OFFICE       | yes                  |
| CLERK             | yes                  |
| CLINICAL DIRECTOR | yes                  |
| DEFAULT           | yes                  |
| ERA AUTOMATION    | yes                  |
| FRONT OFFICE      | yes                  |
| MEDICAL ASSISTANT | yes                  |
| NP/PA             | yes                  |
| NURSE             | yes                  |
| OFFICE MANAGER    | yes                  |
| PARTNER           | yes                  |
| PHYSICIAN         | yes                  |
| TERMED            | yes                  |
| THERAPIST         | yes                  |

Only the two restricted API roles are disabled. This is AMD's **seat-based licensing** for the API roles:

- Existing `ABS-AVMD API` (ABS040325) → Role: API FULL (service account, 2FA disabled)
- Existing `ARCHEALTH API` (ARC022825) → Role: API FULL (service account, 2FA disabled)

Both API FULL seats are allocated. AMD does not allow self-provisioning a 3rd API seat through the office admin UI even for a FULL ADMINISTRATOR. The fix must come from AMD support / billing, not from the office's own admin console.

4. Clicked **Cancel**. No user was created. No changes were saved to AMD. No privileges were modified.

---

## What the main report's cost/workflow analysis needs to update

The main report's "path to full coverage" section said the 6 XMLRPC privileges were a **"5-minute unlock"** and moved the agent from 0.72 FTE coverage to 0.90 FTE. That's incorrect:

- **Not a 5-minute unlock.** It's a ticket to AMD support + seat purchase. Unknown turnaround.
- The 0.72 → 0.90 FTE delta is still valid **conditional on** Gautam acquiring a 3rd API seat, but that's now a **business decision** (cost of additional seat vs agent capability gain), not a technical config step.
- Until the 3rd seat exists, the agent operates with GAUTAM's FULL ADMIN token against REST endpoints only:
  - `scheduler/appointments` (list + detail), `scheduler/columns`
  - `lookup/patients`
  - `scheduler/patients/inactivestatuses`
  - `system/startupvalues`
  - `/api/ppmdmsg` via pm-wfe-137 for actions that **don't** require the "updated/view" privileges
- The unreachable workflows remain: "visits added today" attribution, "patient records updated today" deltas, cancellation/no-show details (list endpoint filters these statuses), and template-scoped note queries.

**Recommended updated verdict:** `0.72 FTE agent coverage today, with a hard ceiling around 0.80 until an API FULL seat is acquired.` The main report's "0.90 with privilege grants" line should be revised to "0.90 conditional on 3rd API seat acquisition" with a qualifier that it's a business/billing decision.

---

## Recommended next action for Gautam

Three mutually exclusive paths, in order of preference:

1. **File an AMD support ticket** asking for an additional API FULL seat on office 161112, named `CLAUDE_API` (or whatever label you prefer). Gautam has the authority to do this as FULL ADMINISTRATOR. Expected cost: typically a small add-on line item. Turnaround: depends on AMD, usually 1-3 business days. This is the clean path.

2. **Repurpose `ABS-AVMD API`** — this service account appears to be tied to AdvancedBilling Solutions, which may or may not be actively used at Exult. If it's dormant (verify first), rotate its password and use it as the agent account. Risk: breaks whatever integration was using it. Cheaper, faster, but brittle.

3. **Accept the ceiling.** Run the agent at 0.72 FTE coverage using REST endpoints only. Defer the XMLRPC view privileges to a later phase. Re-evaluate after the agent is in production for a month and actual cost-of-missing-data is measured rather than estimated.

No action has been taken in AMD — Gautam decides.

---

## Audit trail

All steps captured as screenshots in `.pi/services/exult/audit/amd_admin_2026-04-05/`:

- `amd_admin_01_dashboard.png` — post-2FA login dashboard
- `amd_admin_02_utilities.png` — Utilities dropdown showing User Management
- `amd_admin_03_user_management.png` — User Management Users tab
- `amd_admin_04_roles_list.png` — Roles list (ADMIN, API FULL, API LIMITED, ...)
- `amd_admin_05_after_click.png` — Edit Role panel opened for ADMIN
- `amd_admin_06_api_expanded.png` — API L1 category expanded, showing disabled L2 leaves
- `amd_admin_07_current_state.png` — ADMIN edit state before L1 click
- `amd_admin_08_after_L1_click.png` — ADMIN edit state after L1 API click (only SSO cascades)
- `amd_admin_09_after_cancel.png` — Cancelled Edit Role, back to Roles list
- `amd_admin_10_users_tab.png` — Users tab with full user list
- `amd_admin_11_add_user_dialog.png` — Create User panel open
- `amd_admin_12_form_filled.png` — Form filled, Role dropdown open showing disabled API options
- `amd_admin_13_final_state.png` — After Cancel, dialog closed

No AMD state was modified. No user was created. No role was edited. No save was clicked.
