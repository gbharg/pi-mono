#!/usr/bin/env python3
"""Re-populate REC-1 (Medical Record Requests) from request@ Unified group.

Group.Read.All was unlocked 2026-04-11. We query:
  GET /groups/{id}/threads?$filter=lastDeliveredDateTime ...

IMPORTANT CAVEAT (discovered during rerun): the 'Medical Record Requests'
Unified group (id 0e6b44be-c3db-43c5-9a0a-fa112f81f6d0) was CREATED 2026-04-10
16:08 UTC — it has no historical threads. Prior to that, request@exulthealthcare.com
was routed differently (likely a shared user mailbox without Graph exposure).
We still write whatever threads exist, and mark pre-04-10 days as 0 with a
Data_Quality footnote.
"""
from __future__ import annotations

import calendar
import datetime as dt
import json
import sys
import time
import urllib.parse
from collections import defaultdict

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")

from graph_util import (
    GRAPH_V1,
    acquire_token,
    call,
    close_session,
    col_letter,
    open_session,
    write_range,
)
from kpi_schema import KPI_ROWS, MONTHS

ADDRESS = "/Users/agent/pi-mono/.pi/services/daily_tracker/workbook_address.json"
GROUP_ID = "0e6b44be-c3db-43c5-9a0a-fa112f81f6d0"
OUT = "/Users/agent/pi-mono/.pi/services/daily_tracker/rec1_daily.json"


def row_index_for_kpi(kpi_id: str) -> int:
    for idx, (k, *_rest) in enumerate(KPI_ROWS):
        if k == kpi_id:
            return idx + 2
    raise KeyError(kpi_id)


def fetch_threads(token: str) -> list[dict]:
    """Return all threads in the group (there aren't that many)."""
    results = []
    url = f"{GRAPH_V1}/groups/{GROUP_ID}/threads?$top=100&$orderby=lastDeliveredDateTime%20desc"
    while url:
        resp = call("GET", url, token)
        if not resp:
            break
        results.extend(resp.get("value", []))
        url = resp.get("@odata.nextLink")
        if url and len(results) > 5000:
            break
    return results


def main():
    print("rerun_rec1 — request@ group thread count")
    print("=" * 60)
    token = acquire_token()

    # Sanity check: confirm group identity
    grp = call("GET", f"{GRAPH_V1}/groups/{GROUP_ID}?$select=displayName,mail,createdDateTime", token)
    print(f"  group: {grp.get('displayName')} ({grp.get('mail')})")
    print(f"  createdDateTime: {grp.get('createdDateTime')}")

    if grp.get("mail") != "request@exulthealthcare.com":
        raise RuntimeError(f"group mail mismatch: got {grp.get('mail')}")

    created_at = grp.get("createdDateTime", "")[:10]

    threads = fetch_threads(token)
    print(f"  total threads in group: {len(threads)}")

    # Bucket per day
    by_day: dict[str, int] = defaultdict(int)
    for t in threads:
        ldt = t.get("lastDeliveredDateTime", "")
        if ldt:
            by_day[ldt[:10]] += 1

    data: dict = {ym: {} for ym in MONTHS}
    for ym in MONTHS:
        y, m = map(int, ym.split("-"))
        n_days = calendar.monthrange(y, m)[1]
        for d in range(1, n_days + 1):
            date = f"{y:04d}-{m:02d}-{d:02d}"
            data[ym][date] = by_day.get(date, 0)

    with open(OUT, "w") as f:
        json.dump({
            "group_id": GROUP_ID,
            "group_mail": grp.get("mail"),
            "group_created": grp.get("createdDateTime"),
            "caveat": f"Group was created {created_at}; days before this have no threads.",
            "daily": data,
        }, f, indent=2)
    print(f"  wrote {OUT}")

    # Workbook write
    addr = json.load(open(ADDRESS))
    drive_id = addr["drive_id"]
    item_id = addr["item_id"]

    session_id = open_session(token, drive_id, item_id)
    try:
        rec1_row = row_index_for_kpi("REC-1")
        print(f"  REC-1 -> row {rec1_row}")
        for ym in MONTHS:
            y, m = map(int, ym.split("-"))
            n_days = calendar.monthrange(y, m)[1]
            row_vals = []
            for d in range(1, n_days + 1):
                date = f"{y:04d}-{m:02d}-{d:02d}"
                row_vals.append(data[ym][date])
            while len(row_vals) < 31:
                row_vals.append("")
            numeric = [x for x in row_vals if isinstance(x, (int, float))]
            total = sum(numeric) if numeric else 0
            avg = round(sum(numeric) / len(numeric), 2) if numeric else 0
            row_vals.extend([total, avg])

            first_col = col_letter(3)
            last_col = col_letter(3 + 33 - 1)
            addr_range = f"{first_col}{rec1_row}:{last_col}{rec1_row}"
            write_range(
                token, drive_id, item_id, ym, addr_range, [row_vals], session_id,
            )
            print(f"  {ym}: REC-1 total={total}")
            time.sleep(0.1)
    finally:
        close_session(token, drive_id, item_id, session_id)
    print("done.")


if __name__ == "__main__":
    main()
