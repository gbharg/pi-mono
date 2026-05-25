# Sendblue API Reference

## Authentication

All requests require these headers:
```
sb-api-key-id: <API_KEY>
sb-api-secret-key: <API_SECRET>
```

## Endpoints

### GET /api/messages

Fetch messages with optional filters.

**Query Parameters:**

| Parameter   | Type   | Description                                |
|-------------|--------|--------------------------------------------|
| number      | string | Phone number (URL-encoded, e.g. %2B1...)   |
| limit       | int    | Max messages to return (default 50)        |
| offset      | int    | Pagination offset                          |
| search      | string | Keyword search in message content          |
| from_date   | string | Start date (YYYY-MM-DD)                    |
| to_date     | string | End date (YYYY-MM-DD)                      |
| is_outbound | bool   | Filter by direction                        |

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_abc123",
      "content": "Message text here",
      "number": "+19723637754",
      "is_outbound": false,
      "date": "2026-04-12T10:30:00Z",
      "status": "delivered",
      "media_url": null
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### POST /api/send-message

Send a message (iMessage).

**Body:**
```json
{
  "number": "+19723637754",
  "content": "Your appointment is confirmed for tomorrow at 2pm.",
  "send_style": "regular"
}
```

**Response:**
```json
{
  "status": "queued",
  "message_id": "msg_xyz789"
}
```

### POST /api/send-group-message

Send to a group chat.

**Body:**
```json
{
  "numbers": ["+19723637754", "+1XXXXXXXXXX"],
  "content": "Group message text",
  "group_id": "group_abc"
}
```

### GET /api/contacts

List all contacts with message history.

**Response:**
```json
{
  "contacts": [
    {
      "number": "+19723637754",
      "last_message_date": "2026-04-12T10:30:00Z",
      "message_count": 342
    }
  ]
}
```

## Media Messages

To send media (images, files):
1. Upload to cf-upload endpoint or provide a public URL
2. Include `media_url` in the send-message body

```json
{
  "number": "+19723637754",
  "content": "Here is the report",
  "media_url": "https://example.com/report.pdf"
}
```

## Webhooks

Sendblue can POST inbound messages to a webhook URL. Configure in the Sendblue dashboard.

## Error Codes

| Code | Meaning                    |
|------|----------------------------|
| 401  | Invalid API credentials    |
| 429  | Rate limit exceeded        |
| 400  | Invalid request parameters |
| 500  | Sendblue server error      |
