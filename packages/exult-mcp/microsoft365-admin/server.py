#!/usr/bin/env python3
"""Exult Microsoft 365 Graph (app-only) MCP Server.

Wraps the Exult Agent Service app registration (client_credentials flow) for
tenant-wide admin operations that the claude.ai Microsoft_365 remote MCP does
NOT cover (it's a personal OAuth connection to ONE mailbox).

Covered tools:
  - list_users                (directory listing with filters)
  - get_user                  (profile, roles, licenses)
  - search_users              (startswith on displayName/mail)
  - list_user_mail            (read any user's inbox — service-account scope)
  - get_mail_message          (message body + attachments metadata)
  - list_user_calendar        (calendar view window)
  - list_groups
  - list_group_members
  - list_sharepoint_sites     (site collection discovery)
  - list_sharepoint_drive_items (root children — limited by app scopes)
  - get_tenant_details

Note on scopes: per /Users/agent/pi-mono/memory/reference_m365_app_scopes.md,
the Exult Agent Service app has CANNOT-DO gaps verified 2026-04-10:
  - Cannot reset user passwords without a separate Graph role grant
  - Limited SharePoint site access depending on site-level permissions
Those gaps are reflected here: password-reset tool is intentionally absent.

All operations read-only today.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
import urllib.parse
from pathlib import Path
from typing import Any, Optional

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

CONFIG_PATH = Path(
    os.environ.get(
        "EXULT_M365_CONFIG",
        "/Users/agent/pi-mono/.config/exult/microsoft365.json",
    )
)

_token_cache: dict[str, Any] = {}


def _load_creds() -> dict:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"M365 config not found at {CONFIG_PATH}. Set EXULT_M365_CONFIG."
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
            creds["token_endpoint"],
            data={
                "grant_type": "client_credentials",
                "client_id": creds["client_id"],
                "client_secret": creds["client_secret"],
                "scope": "https://graph.microsoft.com/.default",
            },
        )
        resp.raise_for_status()
        body = resp.json()
    _token_cache["access_token"] = body["access_token"]
    _token_cache["expires_at"] = now + body.get("expires_in", 3500)
    return body["access_token"]


async def _graph(path: str, params: Optional[dict] = None) -> Any:
    creds = _load_creds()
    token = await _get_token()
    url = f"{creds['graph_endpoint']}{path}"
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(
            url,
            params=params,
            headers={"Authorization": f"Bearer {token}"},
        )
        if resp.status_code >= 400:
            return {"error": True, "status": resp.status_code, "body": resp.text[:2000]}
        return resp.json()


app = Server("exult-microsoft365-admin")


@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="list_users",
            description=(
                "List directory users in the Exult tenant (all of exulthealthcare.com). "
                "Supports OData $filter and $top."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "filter": {"type": "string"},
                    "top": {"type": "integer", "default": 100},
                    "select": {
                        "type": "string",
                        "description": "Comma-separated attribute list, e.g. id,displayName,mail,accountEnabled",
                    },
                },
            },
        ),
        Tool(
            name="get_user",
            description="Get a user by object id or userPrincipalName (user@exulthealthcare.com).",
            inputSchema={
                "type": "object",
                "properties": {"user": {"type": "string"}},
                "required": ["user"],
            },
        ),
        Tool(
            name="search_users",
            description="Starts-with search on displayName OR mail.",
            inputSchema={
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        ),
        Tool(
            name="list_user_mail",
            description=(
                "List messages in any tenant user's mailbox (service-account scope). "
                "Set folder='inbox' for the inbox, or omit for all folders."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "user": {"type": "string"},
                    "folder": {"type": "string", "default": "inbox"},
                    "top": {"type": "integer", "default": 25},
                    "filter": {"type": "string"},
                    "search": {"type": "string"},
                },
                "required": ["user"],
            },
        ),
        Tool(
            name="get_mail_message",
            description="Get a single message by id from a user's mailbox (body + attachments metadata).",
            inputSchema={
                "type": "object",
                "properties": {
                    "user": {"type": "string"},
                    "message_id": {"type": "string"},
                },
                "required": ["user", "message_id"],
            },
        ),
        Tool(
            name="list_user_calendar",
            description=(
                "List calendar events in a window for any tenant user. "
                "date_from/date_to are ISO 8601 with tz."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "user": {"type": "string"},
                    "date_from": {"type": "string"},
                    "date_to": {"type": "string"},
                    "top": {"type": "integer", "default": 50},
                },
                "required": ["user", "date_from", "date_to"],
            },
        ),
        Tool(
            name="list_groups",
            description="List all groups in the tenant.",
            inputSchema={
                "type": "object",
                "properties": {"filter": {"type": "string"}, "top": {"type": "integer", "default": 100}},
            },
        ),
        Tool(
            name="list_group_members",
            description="List members of a group by group id.",
            inputSchema={
                "type": "object",
                "properties": {"group_id": {"type": "string"}},
                "required": ["group_id"],
            },
        ),
        Tool(
            name="list_sharepoint_sites",
            description="Discover SharePoint site collections via Graph.",
            inputSchema={
                "type": "object",
                "properties": {"search": {"type": "string"}},
            },
        ),
        Tool(
            name="list_sharepoint_drive_items",
            description="List root children of a SharePoint site's default drive.",
            inputSchema={
                "type": "object",
                "properties": {"site_id": {"type": "string"}},
                "required": ["site_id"],
            },
        ),
        Tool(
            name="get_tenant_details",
            description="Get tenant organization info (verified domains, country, display name).",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]


def _ok(obj: Any) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps(obj, indent=2, default=str))]


def _err(msg: str) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps({"error": True, "message": msg}))]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        if name == "list_users":
            params: dict[str, Any] = {"$top": arguments.get("top", 100)}
            if arguments.get("filter"):
                params["$filter"] = arguments["filter"]
            if arguments.get("select"):
                params["$select"] = arguments["select"]
            return _ok(await _graph("/users", params))

        if name == "get_user":
            user = urllib.parse.quote(arguments["user"], safe="")
            return _ok(await _graph(f"/users/{user}"))

        if name == "search_users":
            q = arguments["query"].replace("'", "''")
            params = {
                "$filter": f"startswith(displayName,'{q}') or startswith(mail,'{q}')",
                "$top": 50,
            }
            return _ok(await _graph("/users", params))

        if name == "list_user_mail":
            user = urllib.parse.quote(arguments["user"], safe="")
            folder = arguments.get("folder", "inbox")
            params: dict[str, Any] = {"$top": arguments.get("top", 25)}
            if arguments.get("filter"):
                params["$filter"] = arguments["filter"]
            if arguments.get("search"):
                params["$search"] = f'"{arguments["search"]}"'
            path = (
                f"/users/{user}/mailFolders/{folder}/messages"
                if folder
                else f"/users/{user}/messages"
            )
            return _ok(await _graph(path, params))

        if name == "get_mail_message":
            user = urllib.parse.quote(arguments["user"], safe="")
            mid = arguments["message_id"]
            return _ok(await _graph(f"/users/{user}/messages/{mid}"))

        if name == "list_user_calendar":
            user = urllib.parse.quote(arguments["user"], safe="")
            params = {
                "startDateTime": arguments["date_from"],
                "endDateTime": arguments["date_to"],
                "$top": arguments.get("top", 50),
            }
            return _ok(await _graph(f"/users/{user}/calendarView", params))

        if name == "list_groups":
            params = {"$top": arguments.get("top", 100)}
            if arguments.get("filter"):
                params["$filter"] = arguments["filter"]
            return _ok(await _graph("/groups", params))

        if name == "list_group_members":
            gid = arguments["group_id"]
            return _ok(await _graph(f"/groups/{gid}/members"))

        if name == "list_sharepoint_sites":
            params: dict[str, Any] = {}
            if arguments.get("search"):
                params["search"] = arguments["search"]
            return _ok(await _graph("/sites", params))

        if name == "list_sharepoint_drive_items":
            sid = arguments["site_id"]
            return _ok(await _graph(f"/sites/{sid}/drive/root/children"))

        if name == "get_tenant_details":
            return _ok(await _graph("/organization"))

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
