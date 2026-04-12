#!/usr/bin/env python3
"""Write aggregated AMD + M365 + RC data into the Daily Operations Tracker workbook.

For each monthly sheet: writes rows 2..41 (KPI rows) across columns D..AH (31 day cols)
plus AI (sum) / AJ (avg). Leaves column A-C untouched (labels written in skeleton).
"""
from __future__ import annotations

import calendar
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")

from graph_util import (
    GRAPH_V1,
    acquire_token,
    close_session,
    col_letter,
    open_session,
    read_range,
    write_range,
)
from kpi_schema import KPI_ROWS, MONTHS

ADDRESS = "/Users/agent/pi-mono/.pi/services/daily_tracker/workbook_address.json"
AMD_DAILY = "/Users/agent/pi-mono/.pi/services/daily_tracker/amd_daily.json"
M365_DAILY = "/Users/agent/pi-mono/.pi/services/daily_tracker/m365_daily.json"
RC_DAILY = "/Users/agent/pi-mono/.pi/services/daily_tracker/rc_daily.json"
RC_ERRORS = "/Users/agent/pi-mono/.pi/services/daily_tracker/rc_errors.json"

# KPI id -> where to find the value for a given date
# Returns a callable(date_key, bundles) -> value
def get_value(kpi_id: str, date: str, amd, m365, rc, rc_retention: set[str]) -> object:
    ym = date[:7]
    amd_day = (amd.get(ym) or {}).get(date) or {}
    m365_day = (m365.get(ym) or {}).get(date) or {}
    rc_day = (rc.get(ym) or {}).get(date)

    # SCH-* and REV-* and NPF-5/NPF-6 come from AMD
    if kpi_id in ("SCH-1", "SCH-2", "SCH-3", "SCH-4", "SCH-5", "SCH-6",
                  "SCH-7", "SCH-8", "SCH-9", "SCH-10",
                  "REV-1", "REV-2", "REV-3", "REV-4", "REV-5", "REV-6",
                  "REV-7", "REV-8", "REV-9",
                  "NPF-5", "NPF-6"):
        return amd_day.get(kpi_id)

    # NPF-7 = inquiry->booking conversion %  (NPF-5 / (NPF-2 + NPF-3 + NPF-4))
    if kpi_id == "NPF-7":
        inquiries = 0
        if rc_day is not None:
            inquiries += 0  # NPF-2 derivation is complex, so leave as None
        return None

    # NPF-3 = Fax referrals = referrals@ mailbox
    if kpi_id == "NPF-3":
        return m365_day.get("referrals")

    # NPF-4 = Web form leads = shaye mailbox
    if kpi_id == "NPF-4":
        return m365_day.get("shaye")

    # NPF-1 = Total inbound calls to main number (RC PHN-1)
    if kpi_id == "NPF-1":
        if rc_day is None:
            return "N/A" if date in rc_retention else None
        return rc_day.get("PHN-1")

    # NPF-2 = inquiries on keypad 1 — RC doesn't give us this easily per day
    # without deeper IVR leg analysis. Use None for now (could backfill later).
    if kpi_id == "NPF-2":
        return None

    # PHN-*
    if kpi_id.startswith("PHN-"):
        if rc_day is None:
            return "N/A" if date in rc_retention else None
        return rc_day.get(kpi_id)

    # RX-1 = prescriptions inbox count
    if kpi_id == "RX-1":
        return m365_day.get("prescriptions")

    # REC-1 = request@ inbox count — blocked by Group.Read.All
    if kpi_id == "REC-1":
        return None

    # REF-1 = inbound referrals (same as NPF-3 for now)
    if kpi_id == "REF-1":
        return m365_day.get("referrals")

    # CI-* : we don't have transcripts here
    if kpi_id.startswith("CI-"):
        return None

    return None


def build_data_rows(ym: str, amd, m365, rc, rc_retention):
    """Produce the 2D values array for rows 2..(2+n_kpis-1), columns D..AJ.
    Columns:
      D..(D+n_days-1) = day values  (31 columns, empty string for days past month end)
      AI = Month Total (sum of numeric days)
      AJ = Month Avg (mean of numeric days, 1 decimal)
    """
    y, m = map(int, ym.split("-"))
    n_days = calendar.monthrange(y, m)[1]
    dates = [f"{y:04d}-{m:02d}-{d:02d}" for d in range(1, n_days + 1)]

    rows = []
    for kpi_id, label, cat, src in KPI_ROWS:
        day_vals = []
        for date in dates:
            v = get_value(kpi_id, date, amd, m365, rc, rc_retention)
            if v is None:
                day_vals.append("")
            else:
                day_vals.append(v)
        # pad to 31 day columns
        while len(day_vals) < 31:
            day_vals.append("")

        # Sum / Avg over numeric day values
        numeric = [x for x in day_vals if isinstance(x, (int, float))]
        total = sum(numeric) if numeric else ""
        avg = round(sum(numeric) / len(numeric), 2) if numeric else ""

        row = day_vals + [total, avg]
        rows.append(row)

    return rows  # n_kpis rows x 33 columns


def main():
    print("Daily Ops Tracker — cell writer")
    print("=" * 60)

    addr = json.load(open(ADDRESS))
    drive_id = addr["drive_id"]
    item_id = addr["item_id"]
    print(f"workbook: {addr['path']}")

    amd = json.load(open(AMD_DAILY))
    m365 = json.load(open(M365_DAILY))
    rc = json.load(open(RC_DAILY)) if Path(RC_DAILY).exists() else {ym: {} for ym in MONTHS}
    rc_retention = set()
    if Path(RC_ERRORS).exists():
        rce = json.load(open(RC_ERRORS))
        rc_retention = set(rce.get("retention_blocked", []))
    print(f"  amd months: {len(amd)}  m365 months: {len(m365)}  rc months: {len(rc)}")
    print(f"  rc retention-blocked days: {len(rc_retention)}")

    token = acquire_token()
    session_id = open_session(token, drive_id, item_id)
    print(f"session open: {session_id[:12]}")
    token_acquired_at = time.time()

    try:
        for ym in MONTHS:
            # refresh token if needed
            if time.time() - token_acquired_at > 45 * 60:
                token = acquire_token()
                token_acquired_at = time.time()

            rows = build_data_rows(ym, amd, m365, rc, rc_retention)
            n_rows = len(rows)
            n_cols = len(rows[0])  # 33 (31 days + sum + avg)
            start_row = 2
            start_col = 3  # 0=A, 3=D

            last_row = start_row + n_rows - 1
            last_col_letter = col_letter(start_col + n_cols - 1)  # AJ
            first_col_letter = col_letter(start_col)  # D
            address = f"{first_col_letter}{start_row}:{last_col_letter}{last_row}"

            write_range(token, drive_id, item_id, ym, address, rows, session_id)
            print(f"  wrote {ym}: {n_rows} rows x {n_cols} cols @ {address}")
            time.sleep(0.2)
    finally:
        close_session(token, drive_id, item_id, session_id)
        print("session closed")

    print("done.")


if __name__ == "__main__":
    main()
