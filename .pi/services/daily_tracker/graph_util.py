"""Shared Microsoft Graph helper for the Daily Operations Tracker build."""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request

CFG_PATH = "/Users/agent/pi-mono/.config/exult/microsoft365.json"
GRAPH_V1 = "https://graph.microsoft.com/v1.0"


def acquire_token() -> str:
    with open(CFG_PATH) as f:
        cfg = json.load(f)
    data = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "scope": "https://graph.microsoft.com/.default",
    }).encode("utf-8")
    req = urllib.request.Request(
        cfg["token_endpoint"],
        data=data,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())["access_token"]


def call(method: str, url: str, token: str, body=None, session_id: str | None = None,
         extra_headers: dict | None = None, timeout: int = 60):
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    if session_id:
        headers["Workbook-Session-Id"] = session_id
    if extra_headers:
        headers.update(extra_headers)
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    for attempt in range(6):
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                if not raw:
                    return None
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    return raw
        except urllib.error.HTTPError as e:
            if e.code == 429:
                retry_after = int(e.headers.get("Retry-After", "5"))
                time.sleep(retry_after + 1)
                continue
            if e.code >= 500 and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            err_body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{method} {url} -> {e.code}: {err_body}") from e
    raise RuntimeError(f"exceeded retries on {method} {url}")


def col_letter(n: int) -> str:
    """0-indexed column number to Excel letter. 0->A, 25->Z, 26->AA."""
    s = ""
    n += 1
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def open_session(token: str, drive_id: str, item_id: str) -> str:
    url = f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}/workbook/createSession"
    resp = call("POST", url, token, {"persistChanges": True})
    return resp["id"]


def close_session(token: str, drive_id: str, item_id: str, session_id: str) -> None:
    url = f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}/workbook/closeSession"
    try:
        call("POST", url, token, {}, session_id=session_id)
    except Exception:
        pass


def add_worksheet(token: str, drive_id: str, item_id: str, name: str,
                  session_id: str | None = None) -> dict:
    url = f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}/workbook/worksheets/add"
    return call("POST", url, token, {"name": name}, session_id=session_id)


def list_worksheets(token: str, drive_id: str, item_id: str,
                    session_id: str | None = None) -> list[dict]:
    url = f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}/workbook/worksheets"
    resp = call("GET", url, token, session_id=session_id)
    return resp.get("value", []) if resp else []


def delete_worksheet(token: str, drive_id: str, item_id: str, name: str,
                     session_id: str | None = None) -> None:
    url = (
        f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}"
        f"/workbook/worksheets('{urllib.parse.quote(name)}')"
    )
    try:
        call("DELETE", url, token, session_id=session_id)
    except Exception:
        pass


def write_range(token: str, drive_id: str, item_id: str, sheet: str,
                address: str, values: list[list], session_id: str) -> dict:
    url = (
        f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}"
        f"/workbook/worksheets('{urllib.parse.quote(sheet)}')"
        f"/range(address='{address}')"
    )
    return call("PATCH", url, token, {"values": values}, session_id=session_id)


def read_range(token: str, drive_id: str, item_id: str, sheet: str,
               address: str, session_id: str | None = None) -> dict:
    url = (
        f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}"
        f"/workbook/worksheets('{urllib.parse.quote(sheet)}')"
        f"/range(address='{address}')"
    )
    return call("GET", url, token, session_id=session_id)


def freeze_panes(token: str, drive_id: str, item_id: str, sheet: str,
                 frozen_rows: int, frozen_cols: int,
                 session_id: str | None = None) -> None:
    """Freeze the first N rows and first N columns of a sheet."""
    url = (
        f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}"
        f"/workbook/worksheets('{urllib.parse.quote(sheet)}')"
        f"/freezePanes/freezeAt"
    )
    # freezeAt takes a range address that is the first UNFROZEN cell
    frozen_range = f"{col_letter(frozen_cols)}{frozen_rows + 1}:{col_letter(frozen_cols)}{frozen_rows + 1}"
    body = {"frozenRange": frozen_range}
    try:
        call("POST", url, token, body, session_id=session_id)
    except Exception:
        # Some tenants require the freezePanes/freezeRows + freezeColumns variant
        try:
            rurl = (
                f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}"
                f"/workbook/worksheets('{urllib.parse.quote(sheet)}')"
                f"/freezePanes/freezeRows"
            )
            call("POST", rurl, token, {"count": frozen_rows}, session_id=session_id)
            curl = (
                f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}"
                f"/workbook/worksheets('{urllib.parse.quote(sheet)}')"
                f"/freezePanes/freezeColumns"
            )
            call("POST", curl, token, {"count": frozen_cols}, session_id=session_id)
        except Exception:
            pass


def upload_empty_workbook(token: str, user: str, path: str) -> dict:
    """Upload a minimal valid empty xlsx to a given OneDrive path."""
    # Minimal valid xlsx built in memory via zipfile
    import io
    import zipfile

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
            '</Types>',
        )
        z.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '</Relationships>',
        )
        z.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>'
            '</Relationships>',
        )
        z.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>'
            '</workbook>',
        )
        z.writestr(
            "xl/worksheets/sheet1.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData/></worksheet>',
        )
        z.writestr(
            "xl/styles.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>'
            '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
            '<borders count="1"><border/></borders>'
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
            '</styleSheet>',
        )
        z.writestr(
            "xl/sharedStrings.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>',
        )
    buf.seek(0)

    url = f"{GRAPH_V1}/users/{urllib.parse.quote(user)}/drive/root:{urllib.parse.quote(path)}:/content"
    req = urllib.request.Request(
        url,
        data=buf.getvalue(),
        method="PUT",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())
