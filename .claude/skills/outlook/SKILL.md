---
description: "Use when reading/sending email, managing calendars, working with OneDrive files, or processing faxes and referrals via Microsoft 365."
allowed-tools:
  - Bash(curl *)
  - Bash(python3 *)
  - Read
  - Grep
  - Glob
---

# /outlook -- Microsoft 365 Operations

## Credentials

Load from `~/claude-workspace/config/credentials/microsoft365.json`
- Tenant ID: 707a7153
- Client ID: 6725660a
- Auth flow: App-only client_credentials (certificate or secret)

## Key Mailboxes

All `@exulthealthcare.com`:

| Mailbox     | Purpose                           |
|-------------|-----------------------------------|
| office@     | General office communications     |
| fax@        | Inbound fax processing (MyFax)    |
| referrals@  | Inbound referral documents        |
| billing@    | Billing inquiries and EOBs        |
| request@    | Patient requests                  |
| refills@    | Medication refill requests        |
| tms@        | TMS program communications        |
| exult-info@ | General info / marketing          |

## Core Operations

### Read Mail
```bash
# Get recent messages from a mailbox
curl -s "https://graph.microsoft.com/v1.0/users/office@exulthealthcare.com/messages?\$top=25&\$orderby=receivedDateTime desc" \
  -H "Authorization: Bearer $GRAPH_TOKEN"
```

### Send Mail
```bash
curl -s -X POST "https://graph.microsoft.com/v1.0/users/office@exulthealthcare.com/sendMail" \
  -H "Authorization: Bearer $GRAPH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":{"subject":"...","body":{"contentType":"Text","content":"..."},"toRecipients":[{"emailAddress":{"address":"..."}}]}}'
```

### Calendar
```bash
# Get events for a date range
curl -s "https://graph.microsoft.com/v1.0/users/office@exulthealthcare.com/calendarView?startDateTime=2026-04-12T00:00:00Z&endDateTime=2026-04-13T00:00:00Z" \
  -H "Authorization: Bearer $GRAPH_TOKEN"
```

### OneDrive Files
```bash
# List files in root
curl -s "https://graph.microsoft.com/v1.0/users/office@exulthealthcare.com/drive/root/children" \
  -H "Authorization: Bearer $GRAPH_TOKEN"
```

## Token Acquisition

```bash
curl -s -X POST "https://login.microsoftonline.com/707a7153-.../oauth2/v2.0/token" \
  -d "client_id=6725660a-...&scope=https://graph.microsoft.com/.default&client_secret=...&grant_type=client_credentials"
```

## Gotchas

- **App-only auth.** Uses client_credentials flow -- no user interaction needed, but some endpoints behave differently in app context.
- **Rate limits.** 2000 requests/second aggregate across the tenant. On HTTP 429, read the `Retry-After` header and wait.
- **Cannot reset passwords.** The Exult Agent Service app does not have password reset permissions. Do not attempt it.
- **No SharePoint access.** Current app registration lacks SharePoint scopes.
- **Fax processing.** Inbound faxes arrive as email attachments to fax@. Use the /pdf skill to extract text.
- **Email address rule.** Never use gautam@searchparty.me. Only use @exulthealthcare.com or gautambharg@gmail.com addresses.

## Reference Docs

- `references/microsoft-graph-overview.md` -- Auth and core concepts
- `references/microsoft-graph-mail.md` -- Mail API details
- `references/microsoft-graph-calendar.md` -- Calendar API details
- `references/microsoft-graph-users.md` -- User management API

## Subagent Guidelines

When spawned as a subagent for email/calendar/M365 tasks:
- Report progress via SendMessage at: task start, after each mailbox processed, and on completion.
- Include counts: emails read, flagged, responded to, calendar events created/modified.
- Never use gautam@searchparty.me -- only @exulthealthcare.com or gautambharg@gmail.com.
- Fax processing: inbound faxes arrive as attachments to fax@. Use /pdf skill to extract text.
- For admin changes (user management, license assignments), use admin-logins.json in config/credentials/.
