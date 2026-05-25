---
name: messages
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

Load from environment (set via `~/.config/openclaw/sendblue.env` or the host's `.env`):

- `SENDBLUE_API_KEY_ID` — the `sb-api-key-id` header value
- `SENDBLUE_API_SECRET_KEY` — the `sb-api-secret-key` header value
- Base URL: `https://api.sendblue.co/api`

Do NOT hardcode credentials in this file. If the values are missing,
ask Gautam for the path to the env file.

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
  -H "sb-api-key-id: $SENDBLUE_API_KEY_ID" \
  -H "sb-api-secret-key: $SENDBLUE_API_SECRET_KEY"
```

### Search Messages by Keyword
```bash
curl -s "https://api.sendblue.co/api/messages?search=appointment&limit=25" \
  -H "sb-api-key-id: $SENDBLUE_API_KEY_ID" \
  -H "sb-api-secret-key: $SENDBLUE_API_SECRET_KEY"
```

### Fetch Messages by Date Range
```bash
curl -s "https://api.sendblue.co/api/messages?from_date=2026-04-01&to_date=2026-04-12&limit=100" \
  -H "sb-api-key-id: $SENDBLUE_API_KEY_ID" \
  -H "sb-api-secret-key: $SENDBLUE_API_SECRET_KEY"
```

## Message Archive

Daily message snapshots are stored at:
```
/Users/agent/pi-mono/.pi/messages/archive/YYYY-MM-DD.json
```

Use the `scripts/fetch-messages.sh` script to fetch and archive today's messages.
See [`INDEX.md`](../INDEX.md) for the canonical pi-mono data paths.

## Gotchas

- **Sendblue is for photos/media.** Text-only messages may also go through BlueBubbles. Check both channels if looking for a specific conversation.
- **Plain text only in outbound messages.** iMessage renders markdown literally -- no asterisks, backticks, or headers.
- **Rate limits.** Sendblue has rate limits on API calls. Don't fetch in tight loops.
- **Message archive format.** Each daily JSON file contains an array of message objects with `content`, `number`, `date`, `is_outbound` fields.
- **Privacy.** Message archives may contain PHI if patients texted in. Treat accordingly.

## Reference Docs

See `references/sendblue-api.md` for full API documentation.
