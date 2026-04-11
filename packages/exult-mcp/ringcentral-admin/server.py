#!/usr/bin/env python3
"""Exult RingCentral Admin MCP Server.

Wraps the RingCentral Platform API with the Remote Admin JWT stored in
/Users/agent/pi-mono/.config/exult/ringcentral.json. Exposes read-only admin
and mid-write operations that Keragon's RC MCP does NOT cover:

  - get_account_info
  - list_extensions              (all extensions on the account)
  - get_extension                (single extension detail)
  - list_call_queues
  - get_call_queue_members
  - pull_call_log                (detailed, paginated, with recording URLs)
  - get_voicemails               (list message store + transcripts when present)
  - get_voicemail_transcript     (AudioTranscription attachment)
  - get_ivr_menus
  - list_phone_numbers
  - get_service_status

Read-only by default. Write tools (add_extension, disable_extension,
update_ivr, update_call_queue) are DISABLED unless the env var
EXULT_RC_ALLOW_WRITES=1 is set at launch time — this is the Gautam-approval gate
from the amd/rc skill playbooks.

All PHI-bearing responses are returned as-is to the MCP client; downstream
consumers are responsible for not persisting them outside approved vaults.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Optional

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

CONFIG_PATH = Path(
    os.environ.get(
        "EXULT_RC_CONFIG",
        "/Users/agent/pi-mono/.config/exult/ringcentral.json",
    )
)
ALLOW_WRITES = os.environ.get("EXULT_RC_ALLOW_WRITES") == "1"

_token_cache: dict[str, Any] = {}


def _load_creds() -> dict:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"RingCentral config not found at {CONFIG_PATH}. Set EXULT_RC_CONFIG or create the file."
        )
    with open(CONFIG_PATH) as f:
        return json.load(f)


async def _get_token() -> str:
    now = time.time()
    if _token_cache.get("expires_at", 0) > now + 60:
        return _token_cache["access_token"]
    creds = _load_creds()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{creds['server']}/restapi/oauth/token",
            auth=(creds["client_id"], creds["client_secret"]),
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": creds["jwt"],
            },
        )
        resp.raise_for_status()
        body = resp.json()
    _token_cache["access_token"] = body["access_token"]
    _token_cache["expires_at"] = now + body.get("expires_in", 3600)
    return body["access_token"]


async def _api_get(path: str, params: Optional[dict] = None) -> Any:
    creds = _load_creds()
    token = await _get_token()
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(
            f"{creds['server']}{path}",
            params=params,
            headers={"Authorization": f"Bearer {token}"},
        )
        if resp.status_code >= 400:
            return {
                "error": True,
                "status": resp.status_code,
                "body": resp.text[:2000],
            }
        return resp.json()


async def _api_get_binary(path: str) -> bytes:
    creds = _load_creds()
    token = await _get_token()
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.get(
            f"{creds['server']}{path}",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.content


app = Server("exult-ringcentral-admin")


@app.list_tools()
async def list_tools() -> list[Tool]:
    tools = [
        Tool(
            name="get_account_info",
            description="Fetch the Exult RingCentral account summary (id, status, service plan, main number).",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="list_extensions",
            description=(
                "List all extensions on the Exult account. Supports filtering by type "
                "(User, Department, Announcement, Voicemail, SharedLinesGroup, IvrMenu, "
                "ParkLocation, ApplicationExtension, Bot) and status (Enabled, Disabled, "
                "NotActivated, Unassigned)."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "extension_type": {"type": "string"},
                    "status": {"type": "string"},
                    "per_page": {"type": "integer", "default": 250},
                },
            },
        ),
        Tool(
            name="get_extension",
            description="Get detail on a single extension by its extension_id (the numeric id, not the dialable number).",
            inputSchema={
                "type": "object",
                "properties": {"extension_id": {"type": "string"}},
                "required": ["extension_id"],
            },
        ),
        Tool(
            name="list_call_queues",
            description="List all call queues (a.k.a. departments) configured on the Exult account.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="get_call_queue_members",
            description="List the extensions that are members of a given call queue.",
            inputSchema={
                "type": "object",
                "properties": {"queue_id": {"type": "string"}},
                "required": ["queue_id"],
            },
        ),
        Tool(
            name="pull_call_log",
            description=(
                "Pull the detailed company call log for a date range. Returns recording "
                "URLs when present. Paginates until the API stops returning a nextPage. "
                "WARNING: can be large — prefer <= 7 day windows for account-wide pulls. "
                "Timestamps are ISO 8601. Types: Voice, Fax. Directions: Inbound, Outbound."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "date_from": {"type": "string", "description": "ISO 8601 with tz, e.g. 2026-04-01T00:00:00-05:00"},
                    "date_to": {"type": "string"},
                    "extension_id": {
                        "type": "string",
                        "description": "Optional extension id to scope to a single extension; omit for account-wide.",
                    },
                    "call_type": {"type": "string", "description": "Voice or Fax; omit for all"},
                    "direction": {"type": "string", "description": "Inbound or Outbound; omit for all"},
                    "max_pages": {"type": "integer", "default": 10},
                },
                "required": ["date_from", "date_to"],
            },
        ),
        Tool(
            name="get_voicemails",
            description=(
                "List voicemail messages on an extension's message store. Returns "
                "message metadata including attachment ids for audio and transcription."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "extension_id": {"type": "string", "description": "Defaults to the authenticated extension (~)"},
                    "date_from": {"type": "string"},
                    "date_to": {"type": "string"},
                    "per_page": {"type": "integer", "default": 100},
                },
            },
        ),
        Tool(
            name="get_voicemail_transcript",
            description=(
                "Fetch the AudioTranscription attachment body for a voicemail message. "
                "Returns the text transcript, or an error if the VM has not been "
                "transcribed yet."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "message_id": {"type": "string"},
                    "attachment_id": {"type": "string"},
                    "extension_id": {"type": "string", "default": "~"},
                },
                "required": ["message_id", "attachment_id"],
            },
        ),
        Tool(
            name="get_ivr_menus",
            description="List auto-receptionist IVR menus on the account.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="list_phone_numbers",
            description="List all phone numbers assigned to the account (main, DIDs, fax, toll-free).",
            inputSchema={
                "type": "object",
                "properties": {"per_page": {"type": "integer", "default": 250}},
            },
        ),
        Tool(
            name="get_service_status",
            description="Check the RingCentral platform service status (outage indicator).",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]
    return tools


def _ok(obj: Any) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps(obj, indent=2, default=str))]


def _err(msg: str) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps({"error": True, "message": msg}))]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        if name == "get_account_info":
            return _ok(await _api_get("/restapi/v1.0/account/~"))

        if name == "list_extensions":
            params: dict[str, Any] = {"perPage": arguments.get("per_page", 250)}
            if arguments.get("extension_type"):
                params["type"] = arguments["extension_type"]
            if arguments.get("status"):
                params["status"] = arguments["status"]
            return _ok(await _api_get("/restapi/v1.0/account/~/extension", params))

        if name == "get_extension":
            ext_id = arguments["extension_id"]
            return _ok(await _api_get(f"/restapi/v1.0/account/~/extension/{ext_id}"))

        if name == "list_call_queues":
            return _ok(
                await _api_get(
                    "/restapi/v1.0/account/~/extension",
                    {"type": "Department", "perPage": 250},
                )
            )

        if name == "get_call_queue_members":
            qid = arguments["queue_id"]
            return _ok(
                await _api_get(f"/restapi/v1.0/account/~/call-queues/{qid}/members")
            )

        if name == "pull_call_log":
            date_from = arguments["date_from"]
            date_to = arguments["date_to"]
            max_pages = int(arguments.get("max_pages", 10))
            ext_id = arguments.get("extension_id")
            base = "/restapi/v1.0/account/~"
            if ext_id:
                base += f"/extension/{ext_id}"
            base += "/call-log"
            records: list[Any] = []
            page = 1
            while page <= max_pages:
                params: dict[str, Any] = {
                    "view": "Detailed",
                    "dateFrom": date_from,
                    "dateTo": date_to,
                    "perPage": 250,
                    "page": page,
                }
                if arguments.get("call_type"):
                    params["type"] = arguments["call_type"]
                if arguments.get("direction"):
                    params["direction"] = arguments["direction"]
                body = await _api_get(base, params)
                if isinstance(body, dict) and body.get("error"):
                    return _ok({"partial": records, "error": body})
                page_records = body.get("records", []) if isinstance(body, dict) else []
                records.extend(page_records)
                nav = body.get("navigation", {}) if isinstance(body, dict) else {}
                if not nav.get("nextPage"):
                    break
                page += 1
            return _ok({"count": len(records), "records": records, "pages_fetched": page})

        if name == "get_voicemails":
            ext_id = arguments.get("extension_id", "~")
            params = {
                "messageType": "VoiceMail",
                "perPage": arguments.get("per_page", 100),
            }
            if arguments.get("date_from"):
                params["dateFrom"] = arguments["date_from"]
            if arguments.get("date_to"):
                params["dateTo"] = arguments["date_to"]
            return _ok(
                await _api_get(
                    f"/restapi/v1.0/account/~/extension/{ext_id}/message-store",
                    params,
                )
            )

        if name == "get_voicemail_transcript":
            ext_id = arguments.get("extension_id", "~")
            mid = arguments["message_id"]
            aid = arguments["attachment_id"]
            content = await _api_get_binary(
                f"/restapi/v1.0/account/~/extension/{ext_id}/message-store/{mid}/content/{aid}"
            )
            return _ok(
                {
                    "message_id": mid,
                    "attachment_id": aid,
                    "transcript": content.decode("utf-8", errors="replace"),
                }
            )

        if name == "get_ivr_menus":
            return _ok(await _api_get("/restapi/v1.0/account/~/ivr-menus"))

        if name == "list_phone_numbers":
            return _ok(
                await _api_get(
                    "/restapi/v1.0/account/~/phone-number",
                    {"perPage": arguments.get("per_page", 250)},
                )
            )

        if name == "get_service_status":
            return _ok(await _api_get("/restapi/v1.0/status"))

        return _err(f"unknown tool: {name}")
    except Exception as exc:
        return _err(f"{type(exc).__name__}: {exc}")


async def _amain() -> None:
    async with stdio_server() as (read, write):
        await app.run(read, write, app.create_initialization_options())


def main() -> None:
    asyncio.run(_amain())


if __name__ == "__main__":
    main()
