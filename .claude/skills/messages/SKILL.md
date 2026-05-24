---
description: "Use when searching past text message conversations, retrieving message history, or cross-referencing messages with session logs."
allowed-tools:
  - Bash(curl *)
  - Bash(python3 *)
  - Bash(bash *)
  - Read
  - Grep
  - Glob
---

# /messages -- Sendblue Message History

## Credentials

- API Key: `761b6555972c38b26212d28b44e76ace`
- API Secret: `bde5ed1e0432426d5e9849a4385fb6e3`
- Base URL: `https://api.sendblue.co/api`

## Approved Contacts

Only interact with messages from/to known contacts:

| Name    | Number           | Notes                    |
|---------|------------------|--------------------------|
| Gautam  | +19723637754     | Primary contact / COO    |

Do not send messages to numbers not on this list without Gautam's approval.

## Core Operations

### Fetch Messages by Phone Number
```bash
curl -s "https://api.sendblue.co/api/messages?number=%2B19723637754&limit=50" \
  -H "sb-api-key-id: 761b6555972c38b26212d28b44e76ace" \
  -H "sb-api-secret-key: bde5ed1e0432426d5e9849a4385fb6e3"
```

### Search Messages by Keyword
```bash
curl -s "https://api.sendblue.co/api/messages?search=appointment&limit=25" \
  -H "sb-api-key-id: 761b6555972c38b26212d28b44e76ace" \
  -H "sb-api-secret-key: bde5ed1e0432426d5e9849a4385fb6e3"
```

### Fetch Messages by Date Range
```bash
curl -s "https://api.sendblue.co/api/messages?from_date=2026-04-01&to_date=2026-04-12&limit=100" \
  -H "sb-api-key-id: 761b6555972c38b26212d28b44e76ace" \
  -H "sb-api-secret-key: bde5ed1e0432426d5e9849a4385fb6e3"
```

## Message Archive

Daily message snapshots are stored at:
```
~/claude-workspace/data/message_archive/YYYY-MM-DD.json
```

Use the `scripts/fetch-messages.sh` script to fetch and archive today's messages.

## Gotchas

- **Sendblue is for photos/media.** Text-only messages may also go through BlueBubbles. Check both channels if looking for a specific conversation.
- **Plain text only in outbound messages.** iMessage renders markdown literally -- no asterisks, backticks, or headers.
- **Rate limits.** Sendblue has rate limits on API calls. Don't fetch in tight loops.
- **Message archive format.** Each daily JSON file contains an array of message objects with `content`, `number`, `date`, `is_outbound` fields.
- **Privacy.** Message archives may contain PHI if patients texted in. Treat accordingly.

## Reference Docs

See `references/sendblue-api.md` for full API documentation.
