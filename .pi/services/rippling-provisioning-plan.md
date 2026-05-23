# Rippling Auto-Provisioning Plan

## Problem

When staff join or leave Exult, accounts in M365, RingCentral, and AdvancedMD must be manually created/disabled. This causes delays, security gaps (stale access), and admin overhead.

## What Was Confirmed (2026-04-26)

1. **Rippling API** has webhooks: `employee.created`, `employee.terminated`, `employee.updated`. OAuth2 auth. Returns startDate, endDate, department, title, employmentStatus.
2. **AMD XMLRPC API** (ARC account, class="api") can READ provider status (ACTIVE/INACTIVE) and profile data. Provider ID 4341 = Ngomeni, currently ACTIVE. Status field confirmed.
3. **AMD has NO write API** for user creation or role changes. User management is UI-only (Playwright).
4. **M365 Graph API** can create/disable users programmatically (already working).
5. **RingCentral API** can provision/disable extensions (already working).

## Proposed Architecture

A webhook receiver (Vercel serverless or local agent) listens for Rippling events.

### Onboarding (employee.created, startDate = today)

1. Create M365 account (Graph API) with role based on department
2. Create RingCentral extension (RC API) with template
3. Queue AMD user creation via Playwright automation (2FA relay, ~2min)
4. Email new hire credentials + welcome packet

### Offboarding (employee.terminated, endDate = today)

1. Disable M365 account (Graph API — block sign-in, revoke sessions)
2. Disable RingCentral extension (RC API — remove from queues, archive VMs)
3. Set AMD provider to INACTIVE via Playwright (change role dropdown, save)
4. Notify admin via iMessage

## Detailed Technical Steps

### Step 1 — Register App in Rippling Developer Portal

1. Go to developer.rippling.com, register developer account
2. Create App Listing: name "Exult Provisioning Agent", category HRIS
3. In Integration tab, configure:
   - Redirect URI: `https://exulthealthcare.com/api/rippling/callback`
   - Webhook URL: `https://exulthealthcare.com/api/rippling/webhook`
   - Scopes: `employee:read`, `company:read`
4. Copy the auto-generated Client ID + Client Secret

### Step 2 — Install App on Exult's Rippling Account

1. From Developer Portal, click Install
2. Rippling admin sees a consent screen granting the scopes
3. Rippling redirects to callback URL with an authorization code
4. Server exchanges the code for access + refresh tokens (code expires in 300s)
5. Store tokens securely in Vercel env vars

### Step 3 — Build Webhook Receiver

Deploy a serverless function at `/api/rippling/webhook` that:

- Receives POST from Rippling on `employee.created`, `employee.terminated`, `employee.updated`
- Re-fetches full employee record via `GET /platform/api/employees/{id}`
- Routes to onboard or offboard flow based on event type + employmentStatus

### Step 4 — Onboarding Flow

When Rippling fires `employee.created` with startDate = today:

1. Create M365 user via Graph API
2. Create RingCentral extension via RC API
3. Queue AMD user creation task via Playwright
4. Send iMessage confirmation

### Step 5 — Offboarding Flow

When Rippling fires `employee.terminated` with endDate = today:

1. Block M365 sign-in + revoke sessions via Graph API
2. Disable RC extension, remove from call queues, archive voicemails
3. Set AMD provider status to INACTIVE via Playwright
4. Send iMessage confirmation

## Timeline

- Phase 1: App registration + webhook receiver — 1 day
- Phase 2: Onboard/offboard logic — 2 days
- Phase 3: AMD Playwright integration — 2 days
- Phase 4: Dry-run test — 1 day
