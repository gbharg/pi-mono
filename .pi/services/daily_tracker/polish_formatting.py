#!/usr/bin/env python3
"""Apply cosmetic formatting to the workbook.

- Bold header row on every sheet
- Wide column A for KPI labels
- Currency format on REV-* rows
- Percent format on SCH-6, SCH-7, REV-9 rows
- Fixed-width day columns
"""
from __future__ import annotations

import calendar
import json
import sys
import time

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")

from graph_util import (
    GRAPH_V1,
    acquire_token,
    call,
    close_session,
    col_letter,
    open_session,
)
from kpi_schema import KPI_ROWS, MONTHS

ADDRESS = "/Users/agent/pi-mono/.pi/services/daily_tracker/workbook_address.json"

KPI_INDEX = {kpi_id: i + 2 for i, (kpi_id, *_) in enumerate(KPI_ROWS)}

# Rows with currency formatting
CURRENCY_ROWS = ["REV-1", "REV-2", "REV-3", "REV-4", "REV-5", "REV-6", "REV-8"]
PERCENT_ROWS = ["SCH-6", "SCH-7", "REV-9", "NPF-7"]


def fmt(token, drive_id, item_id, sheet, address, which, body, session_id, silent=True):
    url = (f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}/workbook/worksheets"
           f"('{sheet}')/range(address='{address}')/format/{which}")
    try:
        call("PATCH", url, token, body, session_id=session_id)
        return True
    except Exception as e:
        if not silent:
            print(f"    fmt {sheet}:{address}:{which} FAIL {str(e)[:120]}")
        return False


def set_number_format(token, drive_id, item_id, sheet, address, number_format, session_id):
    """Use /range(address='X')/numberFormat — via PATCH on the range itself."""
    url = (f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}/workbook/worksheets"
           f"('{sheet}')/range(address='{address}')")
    try:
        # Number format is a 2D array matching the range dims
        # Compute dims
        import re
        m = re.match(r"([A-Z]+)(\d+):([A-Z]+)(\d+)", address)
        if m:
            col_to_i = lambda s: sum((ord(c) - 64) * (26 ** i) for i, c in enumerate(reversed(s))) - 1
            c1 = col_to_i(m.group(1))
            r1 = int(m.group(2))
            c2 = col_to_i(m.group(3))
            r2 = int(m.group(4))
            n_rows = r2 - r1 + 1
            n_cols = c2 - c1 + 1
            nf = [[number_format] * n_cols for _ in range(n_rows)]
        else:
            nf = [[number_format]]
        call("PATCH", url, token, {"numberFormat": nf}, session_id=session_id)
        return True
    except Exception as e:
        print(f"    numberFormat {sheet}:{address} FAIL {str(e)[:120]}")
        return False


def polish_monthly_sheet(token, drive_id, item_id, sheet, session_id):
    y, m = map(int, sheet.split("-"))
    n_days = calendar.monthrange(y, m)[1]
    last_day_col = col_letter(3 + n_days - 1)

    # Header row bold
    fmt(token, drive_id, item_id, sheet, f"A1:AJ1", "font",
        {"bold": True, "size": 11}, session_id)

    # Column A wider (KPI labels)
    fmt(token, drive_id, item_id, sheet, "A:A", "", {"columnWidth": 210}, session_id)
    # B and C narrower
    fmt(token, drive_id, item_id, sheet, "B:B", "", {"columnWidth": 90}, session_id)
    fmt(token, drive_id, item_id, sheet, "C:C", "", {"columnWidth": 60}, session_id)

    # Day columns narrow
    fmt(token, drive_id, item_id, sheet, f"D:{last_day_col}", "", {"columnWidth": 50}, session_id)
    # Sum / Avg columns
    fmt(token, drive_id, item_id, sheet, "AI:AJ", "", {"columnWidth": 80}, session_id)

    # Currency format on REV-* rows
    for kpi in CURRENCY_ROWS:
        r = KPI_INDEX[kpi]
        set_number_format(token, drive_id, item_id, sheet, f"D{r}:AJ{r}", "$#,##0", session_id)

    # Percent format on rate rows
    for kpi in PERCENT_ROWS:
        r = KPI_INDEX[kpi]
        set_number_format(token, drive_id, item_id, sheet, f"D{r}:AJ{r}", "0.0%", session_id)

    # Row 1 header fill
    fmt(token, drive_id, item_id, sheet, f"A1:AJ1", "fill",
        {"color": "#1F3864"}, session_id)
    fmt(token, drive_id, item_id, sheet, f"A1:AJ1", "font",
        {"color": "#FFFFFF", "bold": True, "size": 11}, session_id)

    # Label columns fill (light grey)
    fmt(token, drive_id, item_id, sheet, "A2:C41", "fill",
        {"color": "#EEEEEE"}, session_id)

    # Sum/Avg column fill (light yellow)
    fmt(token, drive_id, item_id, sheet, "AI2:AJ41", "fill",
        {"color": "#FFF2CC"}, session_id)

    # Borders via format/borders on header — skipped for speed


def polish_summary(token, drive_id, item_id, session_id):
    n_months = len(MONTHS)
    first_month = col_letter(3)
    last_month = col_letter(3 + n_months - 1)
    grand_total = col_letter(3 + n_months)
    avg = col_letter(3 + n_months + 1)
    last_col = avg

    fmt(token, drive_id, item_id, "Summary", f"A1:{last_col}1", "font",
        {"bold": True, "color": "#FFFFFF", "size": 11}, session_id)
    fmt(token, drive_id, item_id, "Summary", f"A1:{last_col}1", "fill",
        {"color": "#1F3864"}, session_id)
    fmt(token, drive_id, item_id, "Summary", "A:A", "", {"columnWidth": 220}, session_id)
    fmt(token, drive_id, item_id, "Summary", "B:B", "", {"columnWidth": 95}, session_id)
    fmt(token, drive_id, item_id, "Summary", "C:C", "", {"columnWidth": 60}, session_id)
    fmt(token, drive_id, item_id, "Summary", f"{first_month}:{last_month}", "", {"columnWidth": 95}, session_id)
    fmt(token, drive_id, item_id, "Summary", f"{grand_total}:{avg}", "", {"columnWidth": 100}, session_id)

    # Currency formatting on REV-* rows
    for kpi in CURRENCY_ROWS:
        r = KPI_INDEX[kpi]
        set_number_format(token, drive_id, item_id, "Summary", f"{first_month}{r}:{avg}{r}", "$#,##0", session_id)
    for kpi in PERCENT_ROWS:
        r = KPI_INDEX[kpi]
        set_number_format(token, drive_id, item_id, "Summary", f"{first_month}{r}:{avg}{r}", "0.0%", session_id)

    # Grand total column highlight
    fmt(token, drive_id, item_id, "Summary", f"{grand_total}2:{avg}41", "fill",
        {"color": "#FFF2CC"}, session_id)
    fmt(token, drive_id, item_id, "Summary", "A2:C41", "fill",
        {"color": "#EEEEEE"}, session_id)


def polish_meta(token, drive_id, item_id, session_id):
    for sheet, widths in [
        ("Methodology", {"A": 80, "B": 100, "C": 70, "D": 420, "E": 360, "F": 340}),
        ("Data_Quality", {"A": 120, "B": 100, "C": 130, "D": 400, "E": 100, "F": 320}),
    ]:
        # Header bold + dark fill
        # figure out last col
        last_col = "F"
        fmt(token, drive_id, item_id, sheet, f"A1:{last_col}1", "font",
            {"bold": True, "color": "#FFFFFF", "size": 11}, session_id)
        fmt(token, drive_id, item_id, sheet, f"A1:{last_col}1", "fill",
            {"color": "#1F3864"}, session_id)
        for c, w in widths.items():
            fmt(token, drive_id, item_id, sheet, f"{c}:{c}", "", {"columnWidth": w}, session_id)


def main():
    print("Polish formatting")
    print("=" * 60)
    addr = json.load(open(ADDRESS))
    drive_id = addr["drive_id"]
    item_id = addr["item_id"]

    token = acquire_token()
    session_id = open_session(token, drive_id, item_id)
    print(f"session open: {session_id[:12]}")
    t0 = time.time()

    try:
        for ym in MONTHS:
            if time.time() - t0 > 40 * 60:
                token = acquire_token()
                t0 = time.time()
            polish_monthly_sheet(token, drive_id, item_id, ym, session_id)
            print(f"  polished {ym}")
        polish_summary(token, drive_id, item_id, session_id)
        print("  polished Summary")
        polish_meta(token, drive_id, item_id, session_id)
        print("  polished Methodology + Data_Quality")
    finally:
        close_session(token, drive_id, item_id, session_id)


if __name__ == "__main__":
    main()
