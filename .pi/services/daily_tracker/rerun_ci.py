#!/usr/bin/env python3
"""Populate CI-1..3 (VM transcript analytics) from RingCentral message-store.

Per-extension paginated fetch across voicemail-receiving extensions:
  63624240008 - 8003 Prescription Requests  (Voicemail box)
  63624348008 - 8004 Medical Record Requests (Voicemail box)
  62702195008 - 8000 MDPA Voicemail         (Voicemail box)
  63624223008 - 8002 Rx Refill Voicemail    (Voicemail box)
  63624370008 - 8005 After Hours Voicemail  (Voicemail box)
  881804009   - Queue 55 Front Office       (Department — highest VM volume)
  63198650008 - 201 Shaye                   (User)
  62584081008 - 2002 MDPA After hours       (IVR menu — can route to VM)

Retention: RingCentral keeps ~2 months of VMs in the message store. Expected coverage
is roughly early Feb 2026 onwards.

For each VM with vmTranscriptionStatus == 'Completed':
  - GET the AudioTranscription attachment body (plain text, bearer auth)
  - Classify transcript for complaint and urgent keywords
  - Add to per-day counters

PHI safety: transcript body is NEVER written to disk or stdout — only aggregate
counts. We do persist per-day aggregate counts to ci_daily.json.
"""
from __future__ import annotations

import calendar
import datetime as dt
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")

from extract_rc import acquire_access_token, rc_get
from graph_util import (
    acquire_token,
    close_session,
    col_letter,
    open_session,
    write_range,
)
from kpi_schema import KPI_ROWS, MONTHS

ACCOUNT_ID = "2761864020"
EXTENSIONS = [
    ("63624240008", "8003 Prescription Requests"),
    ("63624348008", "8004 Medical Record Requests"),
    ("62702195008", "8000 MDPA Voicemail"),
    ("63624223008", "8002 Rx Refill Voicemail"),
    ("63624370008", "8005 After Hours Voicemail"),
    ("881804009",   "55 Front Office (Dept)"),
    ("63198650008", "201 Shaye"),
    ("62584081008", "2002 MDPA After hours"),
]

OUT_JSON = "/Users/agent/pi-mono/.pi/services/daily_tracker/ci_daily.json"
ADDRESS = "/Users/agent/pi-mono/.pi/services/daily_tracker/workbook_address.json"

COMPLAINT_KEYWORDS = [
    "complain", "unhappy", "frustrated", "angry",
    "refund", "wait", "hours", "terrible",
]
URGENT_KEYWORDS = [
    "crisis", "suicid", "emergency", "er ",
    "911", "harm", "hurt", "overdose",
]


def row_index_for_kpi(kpi_id: str) -> int:
    for idx, (k, *_rest) in enumerate(KPI_ROWS):
        if k == kpi_id:
            return idx + 2
    raise KeyError(kpi_id)


def fetch_transcript(uri: str, bearer: str) -> str:
    """Fetch transcript body. Returns '' on any failure. NEVER logged."""
    req = urllib.request.Request(uri, headers={"Authorization": f"Bearer {bearer}"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                retry = int(e.headers.get("Retry-After", "5"))
                time.sleep(retry + 1)
                continue
            if e.code >= 500 and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            return ""
        except Exception:
            return ""
    return ""


def classify(text_lc: str) -> tuple[bool, bool]:
    """Return (has_complaint_kw, has_urgent_kw). text_lc must already be lowercased."""
    has_complaint = any(k in text_lc for k in COMPLAINT_KEYWORDS)
    has_urgent = any(k in text_lc for k in URGENT_KEYWORDS)
    return has_complaint, has_urgent


def month_window(ym: str) -> tuple[str, str]:
    y, m = map(int, ym.split("-"))
    date_from = f"{ym}-01T00:00:00Z"
    if m == 12:
        next_ym = f"{y + 1:04d}-01"
    else:
        next_ym = f"{y:04d}-{m + 1:02d}"
    date_to = f"{next_ym}-01T00:00:00Z"
    return date_from, date_to


def fetch_vms_for_month(token: str, ext_id: str, ym: str) -> list[dict]:
    """Fetch all VM records for an extension in a month. Paginate until exhausted."""
    date_from, date_to = month_window(ym)
    all_rec = []
    page = 1
    while True:
        params = {
            "messageType": "VoiceMail",
            "dateFrom": date_from,
            "dateTo": date_to,
            "perPage": 250,
            "page": page,
        }
        try:
            r = rc_get(token, f"/restapi/v1.0/account/{ACCOUNT_ID}/extension/{ext_id}/message-store", params)
        except RuntimeError as e:
            if "401" in str(e):
                raise  # let caller re-auth
            return all_rec
        rec = r.get("records", [])
        all_rec.extend(rec)
        paging = r.get("paging", {})
        if len(rec) < 250 or page >= paging.get("totalPages", 1):
            break
        page += 1
        time.sleep(6.2)
    return all_rec


def main():
    print("rerun_ci — VM transcript analytics")
    print("=" * 60)
    token = acquire_access_token()
    token_at = time.time()
    print("RC token acquired")

    # Accumulators: per-date aggregates
    daily: dict[str, dict[str, int]] = defaultdict(lambda: {"CI-1": 0, "CI-2": 0, "CI-3": 0})
    seen_message_ids: set[int] = set()
    per_ext_summary: dict[str, dict[str, int]] = {}

    for ext_id, label in EXTENSIONS:
        if time.time() - token_at > 45 * 60:
            token = acquire_access_token()
            token_at = time.time()
        total_this_ext = 0
        completed_this_ext = 0
        for ym in MONTHS:
            try:
                rec = fetch_vms_for_month(token, ext_id, ym)
            except RuntimeError as e:
                if "401" in str(e):
                    token = acquire_access_token()
                    token_at = time.time()
                    try:
                        rec = fetch_vms_for_month(token, ext_id, ym)
                    except Exception:
                        rec = []
                else:
                    rec = []
            if not rec:
                continue
            for m in rec:
                mid = m.get("id")
                if mid in seen_message_ids:
                    continue
                seen_message_ids.add(mid)
                total_this_ext += 1
                if m.get("vmTranscriptionStatus") != "Completed":
                    continue
                # Find transcript attachment
                tr_uri = None
                for att in m.get("attachments", []) or []:
                    if att.get("type") == "AudioTranscription":
                        tr_uri = att.get("uri")
                        break
                if not tr_uri:
                    continue
                body = fetch_transcript(tr_uri, token)
                if not body:
                    continue
                # Classify WITHOUT storing or logging
                body_lc = body.lower()
                has_cmp, has_urg = classify(body_lc)
                # Bucket by creationTime date
                ct = (m.get("creationTime") or "")[:10]
                if not ct:
                    continue
                if ct[:7] not in set(MONTHS):
                    continue
                completed_this_ext += 1
                daily[ct]["CI-1"] += 1
                if has_cmp:
                    daily[ct]["CI-2"] += 1
                if has_urg:
                    daily[ct]["CI-3"] += 1
                # SECURITY: deliberately drop body here — do not retain reference
                del body, body_lc
            # brief pacing
            time.sleep(1.2)
        per_ext_summary[label] = {"total_vms_seen": total_this_ext, "completed_transcribed": completed_this_ext}
        print(f"  {label:32s} total_vms={total_this_ext:4d} transcribed={completed_this_ext:4d}")

    # Assemble month-of-month structure
    data: dict = {ym: {} for ym in MONTHS}
    for ym in MONTHS:
        y, m = map(int, ym.split("-"))
        n_days = calendar.monthrange(y, m)[1]
        for d in range(1, n_days + 1):
            date = f"{y:04d}-{m:02d}-{d:02d}"
            data[ym][date] = daily.get(date, {"CI-1": 0, "CI-2": 0, "CI-3": 0})

    # Totals print
    grand = {"CI-1": 0, "CI-2": 0, "CI-3": 0}
    print()
    print(f"  {'Month':<9} {'CI-1':>6} {'CI-2':>6} {'CI-3':>6}")
    for ym in MONTHS:
        c1 = sum(d["CI-1"] for d in data[ym].values())
        c2 = sum(d["CI-2"] for d in data[ym].values())
        c3 = sum(d["CI-3"] for d in data[ym].values())
        grand["CI-1"] += c1
        grand["CI-2"] += c2
        grand["CI-3"] += c3
        print(f"  {ym:<9} {c1:>6} {c2:>6} {c3:>6}")
    print(f"  {'TOTAL':<9} {grand['CI-1']:>6} {grand['CI-2']:>6} {grand['CI-3']:>6}")

    with open(OUT_JSON, "w") as f:
        json.dump({
            "per_ext": per_ext_summary,
            "daily": data,
            "keyword_sets": {
                "complaint": COMPLAINT_KEYWORDS,
                "urgent": URGENT_KEYWORDS,
            },
            "note": "Aggregate counts only. Transcript text was never persisted.",
        }, f, indent=2)
    print(f"  wrote {OUT_JSON}")

    # Workbook write
    addr = json.load(open(ADDRESS))
    drive_id = addr["drive_id"]
    item_id = addr["item_id"]

    gtoken = acquire_token()
    session_id = open_session(gtoken, drive_id, item_id)
    try:
        rows_to_write = [("CI-1", row_index_for_kpi("CI-1")),
                         ("CI-2", row_index_for_kpi("CI-2")),
                         ("CI-3", row_index_for_kpi("CI-3"))]
        for ym in MONTHS:
            y, m = map(int, ym.split("-"))
            n_days = calendar.monthrange(y, m)[1]
            for kpi_id, row_num in rows_to_write:
                row_vals = []
                for d in range(1, n_days + 1):
                    date = f"{y:04d}-{m:02d}-{d:02d}"
                    row_vals.append(data[ym][date][kpi_id])
                while len(row_vals) < 31:
                    row_vals.append("")
                numeric = [x for x in row_vals if isinstance(x, (int, float))]
                total = sum(numeric) if numeric else 0
                avg = round(sum(numeric) / len(numeric), 2) if numeric else 0
                row_vals.extend([total, avg])
                first_col = col_letter(3)
                last_col = col_letter(3 + 33 - 1)
                addr_range = f"{first_col}{row_num}:{last_col}{row_num}"
                write_range(gtoken, drive_id, item_id, ym, addr_range, [row_vals], session_id)
            print(f"  {ym}: wrote CI-1..3")
            time.sleep(0.1)
    finally:
        close_session(gtoken, drive_id, item_id, session_id)
    print("done.")


if __name__ == "__main__":
    main()
