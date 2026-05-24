---
description: "Use when sending or receiving faxes, checking fax status, or working with fax documents via RingCentral."
allowed-tools:
  - Bash(python3 *)
  - Bash(curl *)
  - Read
  - Write
  - Glob
---

# /fax -- Fax Operations

## Fax Number

Exult Healthcare fax line: **+1 (469) 436-6913**

## Sending a Fax

Use the RingCentral MCP `send_fax` tool (requires `RC_ALLOW_WRITES=1` in the ringcentral MCP env).

### Parameters
- `to` (required): Recipient fax number in E.164 format (e.g. `+19725551234`)
- `filePath`: Local file path to fax (PDF, TIFF, DOC, DOCX, TXT, PNG, JPG)
- `fileUrl`: URL of file to download and fax (alternative to filePath)
- `coverPageText`: Optional cover page message

### Supported File Types
PDF, TIFF, PNG, JPG, DOC, DOCX, TXT

### Example via MCP tool
```
send_fax(to: "+19725551234", filePath: "/tmp/referral.pdf", coverPageText: "Attn: Dr. Smith - Patient referral enclosed")
```

### Example via API (when MCP unavailable)
```python
import json, base64, urllib.request, urllib.parse

# Load credentials
with open('/Users/Work/Documents/GitHub/exult-agent/.mcp.json') as f:
    rc = json.load(f)['mcpServers']['ringcentral']['env']

# Authenticate
basic = base64.b64encode(f'{rc["RINGCENTRAL_CLIENT_ID"]}:{rc["RINGCENTRAL_CLIENT_SECRET"]}'.encode()).decode()
data = urllib.parse.urlencode({
    'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    'assertion': rc['RINGCENTRAL_JWT'],
}).encode()
req = urllib.request.Request(
    'https://platform.ringcentral.com/restapi/oauth/token',
    data=data,
    headers={'Authorization': f'Basic {basic}', 'Content-Type': 'application/x-www-form-urlencoded'}
)
token = json.loads(urllib.request.urlopen(req).read())['access_token']
```

Then send with curl:
```bash
curl -X POST "https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~/fax" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'json={"to":[{"phoneNumber":"+19725551234"}],"faxResolution":"High","coverPageText":"Your message here"};type=application/json' \
  -F 'attachment=@/path/to/document.pdf;type=application/pdf'
```

## Checking Fax Status

Use the `list_fax_messages` MCP tool to see sent/received faxes.

### Parameters
- `direction`: `Inbound` or `Outbound`
- `dateFrom` / `dateTo`: ISO 8601 date range
- `perPage`: Results per page

### Fax Message Statuses
- `Queued`: Fax is waiting to be sent
- `Sent`: Fax delivered successfully
- `SendingFailed`: Delivery failed (check `lastModifiedTime` for retry)
- `Received`: Inbound fax received

## Receiving Faxes

Inbound faxes to +1 (469) 436-6913 are stored in the RingCentral message store. Use `list_fax_messages` with `direction: "Inbound"` to retrieve them.

## Common Workflows

### Send a referral fax
1. Generate the referral document (use /word or /pdf skill)
2. Save to /tmp/
3. Send via `send_fax` with cover page text identifying the patient (no PHI in cover page)

### Check if a fax was delivered
1. Use `list_fax_messages` with `direction: "Outbound"` and recent date range
2. Check `messageStatus` field for `Sent` vs `SendingFailed`

### Retrieve incoming faxes
1. Use `list_fax_messages` with `direction: "Inbound"`
2. Download attachments from the message store URI

## Important Notes

- Fax requires Gautam's approval before sending (RC write operation)
- Cover page text should NOT contain PHI (patient names, DOB, etc.)
- Use high resolution (`faxResolution: "High"`) for medical documents
- PDF is the preferred format for medical faxes
