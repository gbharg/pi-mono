# exult-mcp-advancedmd-xmlrpc

Local stdio MCP server for AdvancedMD XMLRPC (`ppmdmsg`) operations that the
Keragon AdvancedMD MCP does **not** expose. Uses the `ARC022825 /
api@exulthealthcare.com` service account on office 161112.

## Why this exists alongside Keragon

| Operation class | Keragon | this MCP |
|---|---|---|
| Patient CRUD | Yes | No |
| Appointment create/update/cancel | Yes | No |
| `getUpdatedPatients` / `getUpdatedVisits` | No | **Yes** |
| `getVisitInfoByDate` | No | **Yes** |
| `getEhrUpdatedNotes` | No | **Yes** (if EHR licensed) |
| `getAppointmentHistory` | No | **Yes** |
| Raw XMLRPC escape hatch | No | **Yes** |

Keragon is HMWK-authed and does NOT use the ARC022825 service account — it
cannot call the service-account-only `getUpdated*` family. This MCP wraps those
operations against the XMLRPC endpoint directly.

## Tools

All READ-ONLY. Writes to AMD are intentionally not exposed — per
`/Users/agent/pi-mono/memory/feedback_amd_writes.md`, every write requires
Gautam's explicit per-operation approval, and Keragon already covers the write
APIs with an audit trail.

- `login_probe`
- `get_updated_patients`
- `get_updated_visits`
- `get_visit_info_by_date`
- `get_ehr_updated_notes`
- `get_appointment_history`
- `raw_xmlrpc_request` (escape hatch)

## Install

```bash
cd /Users/agent/pi-mono/packages/exult-mcp/advancedmd-xmlrpc
uv venv
uv pip install -e .
```

## Claude Desktop wiring

```json
{
  "mcpServers": {
    "exult-advancedmd-xmlrpc": {
      "command": "uv",
      "args": [
        "--directory",
        "/Users/agent/pi-mono/packages/exult-mcp/advancedmd-xmlrpc",
        "run",
        "python",
        "server.py"
      ],
      "env": {
        "EXULT_AMD_CONFIG": "/Users/agent/pi-mono/.config/exult/amd_api_service.json"
      }
    }
  }
}
```

## claude.ai remote MCP

**Not suitable for hosting at claude.ai.** Reasons:

1. PHI heavy — any patient/visit response is PHI. Hosting on a public endpoint
   expands the attack surface and requires a BAA with whoever hosts it.
2. Session auth — AMD XMLRPC uses session cookies tied to a single IP/origin.
   A public Worker fronting this would need to either IP-whitelist at AMD
   (not supported) or proxy through Exult's own network.

Use it locally via Claude Desktop only. If remote access is needed, run it
behind tailscale on Exult-owned hardware.
