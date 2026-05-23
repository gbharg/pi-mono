#!/usr/bin/env python3
"""Exult AdvancedMD XMLRPC (ppmdmsg) MCP Server.

Covers the AMD operations that Keragon's AdvancedMD MCP does NOT expose —
specifically the service-account-scoped `getupdated*` family and
`getvisitinfobydate`, which Gautam's human user account cannot call.

Scope: READ-ONLY. Writes to AMD are intentionally NOT exposed here because:
  1. Gautam requires per-operation explicit approval for AMD writes
     (see memory/feedback_amd_writes.md).
  2. Keragon already covers the write operations (createAppointment, etc.)
     with its own audit trail.

Credentials read from `/Users/agent/pi-mono/.config/exult/amd_api_service.json`
(ARC022825 / api@exulthealthcare.com), set EXULT_AMD_CONFIG to override.

Login is lazy — the first tool call logs in and caches the session token; the
session is reused across subsequent calls until the server exits.
"""
from __future__ import annotations

import asyncio
import http.cookiejar
import json
import os
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

CONFIG_PATH = Path(
    os.environ.get(
        "EXULT_AMD_CONFIG",
        "/Users/agent/pi-mono/.config/exult/amd_api_service.json",
    )
)
LOGIN_URL = "https://partnerlogin.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx"
APP_NAME = "ABS-AVMD"


def _load_creds() -> dict:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"AMD config not found at {CONFIG_PATH}. Set EXULT_AMD_CONFIG."
        )
    with open(CONFIG_PATH) as f:
        return json.load(f)


def _xml_msgtime() -> str:
    return datetime.now().strftime("%m/%d/%Y %I:%M:%S %p")


class AmdSession:
    def __init__(self) -> None:
        self.creds: Optional[dict] = None
        self.webserver: Optional[str] = None
        self.xmlrpc_url: Optional[str] = None
        self.token: Optional[str] = None
        self.cookiejar = http.cookiejar.CookieJar()
        ctx = ssl.create_default_context()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPSHandler(context=ctx),
            urllib.request.HTTPCookieProcessor(self.cookiejar),
        )

    def _post_xml(self, url: str, xml_body: str, timeout: int = 180) -> bytes:
        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "User-Agent": "ExultMCPAdvancedMD/0.1 (python-urllib)",
        }
        if self.token:
            headers["Cookie"] = f"token={self.token}"
        req = urllib.request.Request(
            url,
            data=xml_body.encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with self.opener.open(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            body = exc.read() if hasattr(exc, "read") else b""
            raise RuntimeError(
                f"HTTP {exc.code} {exc.reason} body_head={body[:400]!r}"
            ) from exc

    def login(self) -> None:
        if self.token and self.xmlrpc_url:
            return
        self.creds = _load_creds()
        body = (
            f'<?xml version="1.0" encoding="UTF-8"?>'
            f'<ppmdmsg action="login" class="login" msgtime="{_xml_msgtime()}" '
            f'username="{self.creds["username"]}" psw="{self.creds["password"]}" '
            f'officecode="{self.creds["office_key"]}" appname="{APP_NAME}"/>'
        )
        raw = self._post_xml(LOGIN_URL, body)
        raw_text = raw.decode("iso-8859-1", errors="replace")
        m = re.search(r'webserver="([^"]+)"', raw_text)
        if not m:
            raise RuntimeError(
                f"No webserver attribute in AMD login response: {raw_text[:400]}"
            )
        self.webserver = m.group(1)
        self.xmlrpc_url = f"{self.webserver}/xmlrpc/processrequest.aspx"

        raw2 = self._post_xml(self.xmlrpc_url, body)
        raw2_text = raw2.decode("iso-8859-1", errors="replace")
        if "<Error" in raw2_text and "code>-" in raw2_text:
            m2 = re.search(r"<description>([^<]+)</description>", raw2_text)
            err = m2.group(1) if m2 else raw2_text[:400]
            raise RuntimeError(f"AMD login failed: {err}")
        m3 = re.search(r"<usercontext[^>]*>([^<]*)</usercontext>", raw2_text)
        if not (m3 and m3.group(1)):
            raise RuntimeError(
                f"AMD login returned no usercontext token: {raw2_text[:400]}"
            )
        self.token = m3.group(1).strip()

    def request(self, xml_body: str, timeout: int = 300) -> str:
        self.login()
        assert self.xmlrpc_url
        raw = self._post_xml(self.xmlrpc_url, xml_body, timeout=timeout)
        return raw.decode("iso-8859-1", errors="replace")


_session = AmdSession()
app = Server("exult-advancedmd-xmlrpc")


@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="login_probe",
            description=(
                "Verify the XMLRPC session logs in and returns fieldset metadata. "
                "Use this first to confirm the service account is reachable."
            ),
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="get_updated_patients",
            description=(
                "Fetch patients created or modified in a date range. Uses the "
                "getupdatedpatients XMLRPC action that requires the ARC022825 "
                "service account. from_date/to_date are MM/DD/YYYY."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "from_date": {"type": "string"},
                    "to_date": {"type": "string"},
                    "include_deleted": {"type": "boolean", "default": False},
                },
                "required": ["from_date", "to_date"],
            },
        ),
        Tool(
            name="get_updated_visits",
            description=(
                "Fetch visits (charges/claims) created or modified in a date range. "
                "MM/DD/YYYY. Use this for cohort extract and Q1-style reports."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "from_date": {"type": "string"},
                    "to_date": {"type": "string"},
                },
                "required": ["from_date", "to_date"],
            },
        ),
        Tool(
            name="get_visit_info_by_date",
            description=(
                "Fetch visit detail rows for a date range. Complements "
                "getupdatedvisits when you want all visits on a given DOS rather "
                "than updates since a timestamp."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "from_date": {"type": "string"},
                    "to_date": {"type": "string"},
                },
                "required": ["from_date", "to_date"],
            },
        ),
        Tool(
            name="get_ehr_updated_notes",
            description=(
                "Fetch clinical notes updated since a timestamp (service-account "
                "scoped; requires PM+EHR licensing — will error if the scope is PM-only)."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "from_date": {"type": "string"},
                    "to_date": {"type": "string"},
                },
                "required": ["from_date", "to_date"],
            },
        ),
        Tool(
            name="get_appointment_history",
            description=(
                "Fetch appointment audit history (create/update/cancel events) "
                "for a date range."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "from_date": {"type": "string"},
                    "to_date": {"type": "string"},
                },
                "required": ["from_date", "to_date"],
            },
        ),
        Tool(
            name="raw_xmlrpc_request",
            description=(
                "ESCAPE HATCH: post a raw ppmdmsg XML body to the session. Use "
                "only when the structured tools don't cover the action you need. "
                "The <?xml?> declaration is added automatically; pass just the "
                "<ppmdmsg .../> element."
            ),
            inputSchema={
                "type": "object",
                "properties": {"xml_body": {"type": "string"}},
                "required": ["xml_body"],
            },
        ),
    ]


def _ok(obj: Any) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps(obj, indent=2, default=str))]


def _err(msg: str) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps({"error": True, "message": msg}))]


def _msg(action: str, extra_attrs: str = "") -> str:
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f'<ppmdmsg action="{action}" class="api" '
        f'msgtime="{_xml_msgtime()}"{extra_attrs}/>'
    )


def _truncated(body: str, limit: int = 120_000) -> dict:
    truncated = len(body) > limit
    return {
        "bytes": len(body),
        "truncated": truncated,
        "body": body[:limit],
        "note": (
            "Response truncated — pull via raw_xmlrpc_request with a tighter date "
            "window if you need the tail."
            if truncated
            else None
        ),
    }


def _run_in_thread(fn, *args, **kwargs):
    return asyncio.get_event_loop().run_in_executor(None, lambda: fn(*args, **kwargs))


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        if name == "login_probe":
            await _run_in_thread(_session.login)
            probe = _msg("getfieldsets")
            body = await _run_in_thread(_session.request, probe, 60)
            return _ok(
                {
                    "logged_in": True,
                    "webserver": _session.webserver,
                    "token_head": (_session.token or "")[:20] + "…",
                    "probe": _truncated(body, 10_000),
                }
            )

        if name == "get_updated_patients":
            include_deleted = "1" if arguments.get("include_deleted") else "0"
            msg = _msg(
                "getupdatedpatients",
                f' fromdate="{arguments["from_date"]}" '
                f'todate="{arguments["to_date"]}" '
                f'includedeleted="{include_deleted}"',
            )
            body = await _run_in_thread(_session.request, msg, 300)
            return _ok(_truncated(body))

        if name == "get_updated_visits":
            msg = _msg(
                "getupdatedvisits",
                f' fromdate="{arguments["from_date"]}" '
                f'todate="{arguments["to_date"]}"',
            )
            body = await _run_in_thread(_session.request, msg, 300)
            return _ok(_truncated(body))

        if name == "get_visit_info_by_date":
            msg = _msg(
                "getvisitinfobydate",
                f' fromdate="{arguments["from_date"]}" '
                f'todate="{arguments["to_date"]}"',
            )
            body = await _run_in_thread(_session.request, msg, 300)
            return _ok(_truncated(body))

        if name == "get_ehr_updated_notes":
            msg = _msg(
                "getehrupdatednotes",
                f' fromdate="{arguments["from_date"]}" '
                f'todate="{arguments["to_date"]}"',
            )
            body = await _run_in_thread(_session.request, msg, 300)
            return _ok(_truncated(body))

        if name == "get_appointment_history":
            msg = _msg(
                "getappointmenthistory",
                f' fromdate="{arguments["from_date"]}" '
                f'todate="{arguments["to_date"]}"',
            )
            body = await _run_in_thread(_session.request, msg, 300)
            return _ok(_truncated(body))

        if name == "raw_xmlrpc_request":
            raw = arguments["xml_body"].strip()
            if not raw.startswith("<?xml"):
                raw = f'<?xml version="1.0" encoding="UTF-8"?>{raw}'
            body = await _run_in_thread(_session.request, raw, 600)
            return _ok(_truncated(body))

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
