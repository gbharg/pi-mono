#!/usr/bin/env python3
"""Verification pass: read back random cells from the workbook and check
they match the source aggregation."""
from __future__ import annotations

import calendar
import json
import random
import sys

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")

from graph_util import (
    acquire_token,
    close_session,
    col_letter,
    open_session,
    read_range,
)
from kpi_schema import KPI_ROWS, MONTHS

ADDRESS = "/Users/agent/pi-mono/.pi/services/daily_tracker/workbook_address.json"
AMD_DAILY = "/Users/agent/pi-mono/.pi/services/daily_tracker/amd_daily.json"
M365_DAILY = "/Users/agent/pi-mono/.pi/services/daily_tracker/m365_daily.json"
RC_DAILY = "/Users/agent/pi-mono/.pi/services/daily_tracker/rc_daily.json"

KPI_INDEX = {kpi_id: i + 2 for i, (kpi_id, *_) in enumerate(KPI_ROWS)}

random.seed(42)


def main():
    addr = json.load(open(ADDRESS))
    drive_id = addr["drive_id"]
    item_id = addr["item_id"]

    amd = json.load(open(AMD_DAILY))
    m365 = json.load(open(M365_DAILY))
    try:
        rc = json.load(open(RC_DAILY))
    except FileNotFoundError:
        rc = {ym: {} for ym in MONTHS}

    token = acquire_token()
    session_id = open_session(token, drive_id, item_id)

    print("Verification readback")
    print("=" * 60)
    passed = 0
    failed = 0
    checks = []

    try:
        # Pick 3 random (month, kpi, day) checks per sheet, prefer months with
        # complete data (2026-01..2026-04) for SCH and REV
        for ym in MONTHS:
            y, m = map(int, ym.split("-"))
            n_days = calendar.monthrange(y, m)[1]
            for _ in range(3):
                kpi_id = random.choice(["SCH-1", "SCH-5", "NPF-3", "PHN-1", "REV-2"])
                # Map date to column: day N -> col (3 + N - 1) = (N+2), which starts D
                day_n = random.randint(1, n_days)
                col_idx = 3 + day_n - 1
                excel_col = col_letter(col_idx)
                excel_row = KPI_INDEX[kpi_id]
                address = f"{excel_col}{excel_row}"
                try:
                    resp = read_range(token, drive_id, item_id, ym, address, session_id=session_id)
                    workbook_val = resp.get("values", [[None]])[0][0]
                except Exception as e:
                    print(f"  READ FAIL {ym} {kpi_id} {address}: {e}")
                    failed += 1
                    continue
                date = f"{y:04d}-{m:02d}-{day_n:02d}"
                # Expected source value:
                if kpi_id in ("SCH-1", "SCH-5"):
                    src_val = (amd.get(ym, {}).get(date) or {}).get(kpi_id)
                elif kpi_id == "REV-2":
                    src_val = (amd.get(ym, {}).get(date) or {}).get("REV-2")
                elif kpi_id == "NPF-3":
                    src_val = (m365.get(ym, {}).get(date) or {}).get("referrals")
                elif kpi_id == "PHN-1":
                    src_val = (rc.get(ym, {}).get(date) or {}).get("PHN-1")
                else:
                    src_val = None

                # Compare: workbook blank/None vs src None/0 should match
                if src_val is None:
                    ok = workbook_val in (None, "", 0)
                else:
                    try:
                        ok = abs(float(workbook_val or 0) - float(src_val or 0)) < 0.01
                    except (TypeError, ValueError):
                        ok = str(workbook_val) == str(src_val)

                status = "PASS" if ok else "FAIL"
                if ok:
                    passed += 1
                else:
                    failed += 1
                checks.append({
                    "sheet": ym, "kpi": kpi_id, "date": date,
                    "cell": address, "workbook": workbook_val, "source": src_val,
                    "status": status,
                })
                print(f"  {ym} {kpi_id} {date} {address}: wb={workbook_val} src={src_val} [{status}]")

    finally:
        close_session(token, drive_id, item_id, session_id)

    print(f"\n  passed={passed}  failed={failed}")
    with open("/Users/agent/pi-mono/.pi/services/daily_tracker/verification_log.json", "w") as f:
        json.dump({"passed": passed, "failed": failed, "checks": checks}, f, indent=2)


if __name__ == "__main__":
    main()
