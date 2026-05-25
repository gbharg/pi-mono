---
name: ringcentral
description: "Use when analyzing call logs, checking voicemails, managing call queues, sending SMS/fax, or working with RingCentral."
allowed-tools:
  - Bash(curl *)
  - Bash(python3 *)
  - Read
  - Grep
  - Glob
---

# /ringcentral -- RingCentral Phone Operations

## Credentials

Load from `/Users/agent/pi-mono/.config/exult/ringcentral.json`.
See [`INDEX.md`](../INDEX.md) for the canonical credential / data paths.

## Key Numbers & Extensions

| Name           | Extension | Notes                        |
|----------------|-----------|------------------------------|
| Main line      | --        | (972) 369-4220               |
| IVR            | 2000      | Main auto-attendant          |
| Queue          | 55        | Front desk ring group        |
| Dani           | 104       | Front desk, queue member     |
| Laura          | 203       | Queue member                 |

## Core Operations

### Call Logs
```bash
# Fetch recent call logs (max 250/page)
curl -s "$RC_BASE/restapi/v1.0/account/~/call-log?perPage=250&dateFrom=2026-04-01T00:00:00Z" \
  -H "Authorization: Bearer $RC_TOKEN"
```

### Voicemail with Transcripts
```bash
# Get voicemails -- transcripts are in AudioTranscription attachment type
curl -s "$RC_BASE/restapi/v1.0/account/~/extension/~/message-store?messageType=VoiceMail" \
  -H "Authorization: Bearer $RC_TOKEN"
```

Look for attachment with `type: "AudioTranscription"` to get the transcript text.

### SMS
```bash
curl -s -X POST "$RC_BASE/restapi/v1.0/account/~/extension/~/sms" \
  -H "Authorization: Bearer $RC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from":{"phoneNumber":"+19723694220"},"to":[{"phoneNumber":"+1XXXXXXXXXX"}],"text":"Message"}'
```

### Queue Management
```bash
# Update queue members -- use removedExtensionIds (NOT removedMemberIds)
curl -s -X PUT "$RC_BASE/restapi/v1.0/account/~/call-queues/$QUEUE_ID/members" \
  -H "Authorization: Bearer $RC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"removedExtensionIds":["12345"]}'
```

## Data Archive

RC call log exports and voicemail archives live at `/Users/agent/pi-mono/.pi/services/rc/archive/`.

## Gotchas

- **removedExtensionIds NOT removedMemberIds.** The queue member removal field is `removedExtensionIds`. Using the wrong field name silently does nothing.
- **Max 250 records/page.** Always paginate. Check for `navigation.nextPage` in responses.
- **Voicemail transcripts only.** Full call recording transcripts require RingSense (not available). Voicemail transcripts work via `AudioTranscription` attachment type.
- **Call recording retention.** 90 days. If you need older recordings, they won't be available via API.
- **Rate limits.** RC enforces per-endpoint rate limits. Back off on 429 responses.
- **Extension 55 is protected.** Never disable or remove queue extension 55.

## Reference Docs

- `references/ringcentral-api-reference.md` -- Quick reference for common endpoints
- `references/ringcentral-api-reference.yml` -- Full OpenAPI spec

## Subagent Guidelines

When spawned as a subagent for phone tasks:
- Report progress via SendMessage at: task start, after data retrieval, and on completion.
- Include specific numbers: call count, voicemail count, queue status, extensions affected.
- Extension 55 is protected -- never disable or remove it.
- Always paginate (max 250/page). Check navigation.nextPage.
- Voicemail transcripts work (AudioTranscription attachment). Full call transcripts require RingSense (not available).
- After queue changes, verify the change by re-fetching the queue members.
