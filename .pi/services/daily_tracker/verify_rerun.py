#!/usr/bin/env python3
"""Read back sample cells for each fixed gap and print actual values."""
from __future__ import annotations

import calendar
import json
import sys

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")

from graph_util import acquire_token, col_letter, read_range
from kpi_schema import KPI_ROWS

ADDRESS = "/Users/agent/pi-mono/.pi/services/daily_tracker/workbook_address.json"


def row_num(kpi_id: str) -> int:
    for i, (k, *_) in enumerate(KPI_ROWS):
        if k == kpi_id:
            return i + 2
    raise KeyError(kpi_id)


def col_for_day(date: str) -> str:
    day = int(date.split("-")[2])
    return col_letter(3 + (day - 1))  # D=day1


def main():
    addr = json.load(open(ADDRESS))
    drive_id = addr["drive_id"]
    item_id = addr["item_id"]
    token = acquire_token()

    samples = [
        # (sheet, kpi, date, description)
        ("2025-07", "REV-1", "2025-07-18", "REV-1 mid-July charges"),
        ("2025-12", "REV-2", "2025-12-15", "REV-2 mid-Dec paid"),
        ("2026-03", "REV-6", "2026-03-24", "REV-6 Mar writeoff"),
        ("2026-04", "REC-1", "2026-04-10", "REC-1 group welcome thread (should be 1)"),
        ("2025-08", "REC-1", "2025-08-15", "REC-1 pre-group-create (should be 0)"),
        ("2026-03", "CI-1", "2026-03-23", "CI-1 VM transcripts late March"),
        ("2026-02", "CI-2", "2026-02-26", "CI-2 complaints Feb end"),
        ("2026-03", "CI-3", "2026-03-12", "CI-3 urgent hits Mar 12"),
        ("2026-04", "NPF-2", "2026-04-10", "NPF-2 keypad1 enablement day (expect 7)"),
        ("2026-04", "NPF-2", "2026-04-09", "NPF-2 Apr 9 stray (expect 1)"),
        ("2026-03", "NPF-2", "2026-03-15", "NPF-2 pre-enablement (expect 0)"),
        ("2025-07", "NPF-2", "2025-07-15", "NPF-2 far before window (expect blank)"),
    ]

    print("Verification Readback")
    print("=" * 80)
    for sheet, kpi, date, desc in samples:
        row = row_num(kpi)
        col = col_for_day(date)
        addr_range = f"{col}{row}:{col}{row}"
        r = read_range(token, drive_id, item_id, sheet, addr_range)
        val = r.get("values", [[None]])[0][0] if r else None
        print(f"  {sheet} / {kpi} / {date} ({addr_range}) = {val!r}  -- {desc}")

    # Also read a few month totals
    print()
    print("Month totals (col AI):")
    rev_checks = [
        ("2025-07", "REV-1"),
        ("2025-12", "REV-2"),
        ("2026-03", "REV-6"),
        ("2026-04", "CI-1"),
        ("2026-04", "NPF-2"),
        ("2026-04", "REC-1"),
    ]
    for sheet, kpi in rev_checks:
        row = row_num(kpi)
        addr_range = f"AI{row}:AI{row}"
        r = read_range(token, drive_id, item_id, sheet, addr_range)
        val = r.get("values", [[None]])[0][0] if r else None
        print(f"  {sheet} / {kpi} month total = {val!r}")


if __name__ == "__main__":
    main()
