#!/usr/bin/env python3
"""Patch Summary sheet REV-*, REC-1, CI-*, NPF-2, NPF-7 cells using the new rerun data.

This keeps the Summary sheet in sync with the re-populated monthly sheets.
Only touches the affected rows (14 rows x 12 months = 168 cells + totals).
"""
from __future__ import annotations

import calendar
import json
import sys
import time

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")

from graph_util import (
    acquire_token,
    close_session,
    col_letter,
    open_session,
    write_range,
)
from kpi_schema import KPI_ROWS, MONTHS

ADDRESS = "/Users/agent/pi-mono/.pi/services/daily_tracker/workbook_address.json"
REV_JSON = "/Users/agent/pi-mono/.pi/services/daily_tracker/rev_rerun_daily.json"
REC1_JSON = "/Users/agent/pi-mono/.pi/services/daily_tracker/rec1_daily.json"
CI_JSON = "/Users/agent/pi-mono/.pi/services/daily_tracker/ci_daily.json"
NPF_JSON = "/Users/agent/pi-mono/.pi/services/daily_tracker/npf_rerun_daily.json"

# KPIs whose Summary row we need to update
TARGET_KPIS = [
    "REV-1", "REV-2", "REV-3", "REV-4", "REV-5", "REV-6", "REV-7", "REV-8", "REV-9",
    "REC-1",
    "CI-1", "CI-2", "CI-3",
    "NPF-2", "NPF-7",
]


def row_num(kpi_id: str) -> int:
    for i, (k, *_) in enumerate(KPI_ROWS):
        if k == kpi_id:
            return i + 2
    raise KeyError(kpi_id)


def monthly_total(data: dict, ym: str, kpi_id: str) -> float | str:
    days = data.get(ym, {}) or {}
    vals = []
    for date, bucket in days.items():
        if isinstance(bucket, dict):
            v = bucket.get(kpi_id)
        else:
            v = bucket
        if isinstance(v, (int, float)):
            vals.append(v)
    if not vals:
        return ""
    return round(sum(vals), 2) if any(isinstance(x, float) for x in vals) else sum(vals)


def main():
    print("rerun_summary - patch Summary sheet for unblocked KPIs")
    print("=" * 60)

    rev = json.load(open(REV_JSON))
    rec1 = json.load(open(REC1_JSON))["daily"]
    # CI json shape: {"daily": {ym: {date: {CI-1,CI-2,CI-3}}}}
    ci = json.load(open(CI_JSON))["daily"]
    npf = json.load(open(NPF_JSON))["daily"]

    # REC-1 daily shape: {ym: {date: int}} -> wrap to bucket
    rec1_wrapped: dict = {ym: {} for ym in MONTHS}
    for ym, days in rec1.items():
        for date, n in days.items():
            rec1_wrapped[ym][date] = {"REC-1": n}

    addr = json.load(open(ADDRESS))
    drive_id = addr["drive_id"]
    item_id = addr["item_id"]

    token = acquire_token()
    sid = open_session(token, drive_id, item_id)
    try:
        # Summary sheet columns: A,B,C labels + D..O months (12) + P grand total + Q avg
        for kpi_id in TARGET_KPIS:
            row = row_num(kpi_id)
            values: list[float | str] = []
            for ym in MONTHS:
                if kpi_id.startswith("REV-"):
                    v = monthly_total(rev, ym, kpi_id)
                elif kpi_id == "REC-1":
                    v = monthly_total(rec1_wrapped, ym, "REC-1")
                elif kpi_id.startswith("CI-"):
                    v = monthly_total(ci, ym, kpi_id)
                elif kpi_id in ("NPF-2", "NPF-7"):
                    v = monthly_total(npf, ym, kpi_id)
                else:
                    v = ""
                values.append(v)
            # grand total + avg
            numeric = [x for x in values if isinstance(x, (int, float))]
            grand = round(sum(numeric), 2) if numeric else ""
            avg = round(sum(numeric) / len(numeric), 2) if numeric else ""
            row_vals = values + [grand, avg]

            first_col = col_letter(3)  # D
            last_col = col_letter(3 + len(MONTHS) + 1)  # Q
            addr_range = f"{first_col}{row}:{last_col}{row}"
            write_range(token, drive_id, item_id, "Summary", addr_range, [row_vals], sid)
            print(f"  {kpi_id:<6} row {row:<3} -> {[v if isinstance(v,(int,float)) else '' for v in values]}")
            time.sleep(0.1)
    finally:
        close_session(token, drive_id, item_id, sid)
    print("done.")


if __name__ == "__main__":
    main()
