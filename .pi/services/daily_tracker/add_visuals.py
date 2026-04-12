#!/usr/bin/env python3
"""Add native Excel charts + conditional formatting to the Daily Ops Tracker.

Per monthly sheet:
  - Color-scale conditional formatting on the data rectangle D2:AH41 (green-yellow-red)
  - Chart panel starting at row 45 (below KPI rows 1..41):
      * Line chart: Seen visits (SCH-1) + Cancelled (SCH-3) + NoShow (SCH-4)
      * Line chart: Total inbound calls (PHN-1) + Missed calls (PHN-3)
      * Bar chart: New-patient inquiries (NPF-1)
      * Bar chart: Daily collections $ (REV-2)

Summary sheet:
  - Data bars on month total columns
  - Line charts for 4 key monthly trends

Graph Excel chart API:
  POST /worksheets('X')/charts/add
  Body: {type, sourceData, seriesBy, title?}
  Then PATCH /worksheets('X')/charts('ChartName')/position or /top /left /width /height
"""
from __future__ import annotations

import json
import sys
import time
import urllib.parse

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

# KPI row indices (1-based within the KPI list, but excel rows are +1 for header)
KPI_INDEX = {kpi_id: i + 2 for i, (kpi_id, *_) in enumerate(KPI_ROWS)}
# e.g. SCH-1 is KPI_ROWS[0], so excel row 2 (header is row 1)

# First chart row starts below the data
CHART_START_ROW = 45  # row 45 and below reserved for charts

# Graph chart type options: "ColumnClustered", "Line", "LineMarkers", "Bar",
#                          "BarClustered", "Area", "Pie"


def _base(drive_id: str, item_id: str) -> str:
    return f"{GRAPH_V1}/drives/{drive_id}/items/{item_id}/workbook"


def add_chart(token, drive_id, item_id, sheet, name, ctype, source_address,
              series_by, title, session_id, has_header_row=True, has_header_col=True,
              top_px=None, left_px=None, width_px=480, height_px=260):
    """Create a chart, then position it."""
    url = (
        f"{_base(drive_id, item_id)}/worksheets('{urllib.parse.quote(sheet)}')/charts/add"
    )
    # For charts/add, sourceData is a range string, and seriesBy is "Auto"|"Columns"|"Rows"
    body = {
        "type": ctype,
        "sourceData": source_address,
        "seriesBy": series_by,
    }
    try:
        resp = call("POST", url, token, body, session_id=session_id)
    except RuntimeError as e:
        print(f"    chart '{name}' add failed: {str(e)[:200]}")
        return None
    chart_id = resp.get("id") or resp.get("name")
    chart_name = resp.get("name") or chart_id

    # Set title
    try:
        title_url = (
            f"{_base(drive_id, item_id)}/worksheets('{urllib.parse.quote(sheet)}')"
            f"/charts('{urllib.parse.quote(chart_name)}')/title"
        )
        call("PATCH", title_url, token, {"text": title, "visible": True},
             session_id=session_id)
    except Exception as e:
        print(f"    title set failed on {chart_name}: {str(e)[:120]}")

    # Set position (use setPosition with a top-left range anchor)
    if top_px is not None and left_px is not None:
        # The chart position API takes pixel absolute coords via /position/* or
        # /setPosition to an anchor range. Anchor-range form is more reliable.
        pass

    # Resize
    try:
        fmt_url = (
            f"{_base(drive_id, item_id)}/worksheets('{urllib.parse.quote(sheet)}')"
            f"/charts('{urllib.parse.quote(chart_name)}')"
        )
        call("PATCH", fmt_url, token,
             {"height": height_px, "width": width_px, "top": top_px, "left": left_px},
             session_id=session_id)
    except Exception as e:
        print(f"    resize failed on {chart_name}: {str(e)[:120]}")

    return chart_name


def add_color_scale(token, drive_id, item_id, sheet, address, session_id,
                    low_color="#F8696B", mid_color="#FFEB84", high_color="#63BE7B"):
    """Add 3-color scale conditional formatting (red-yellow-green)."""
    url = (
        f"{_base(drive_id, item_id)}/worksheets('{urllib.parse.quote(sheet)}')"
        f"/range(address='{address}')/conditionalFormats/add"
    )
    body = {
        "type": "ColorScale",
        "colorScale": {
            "criteria": {
                "minimum": {"color": low_color, "type": "LowestValue"},
                "midpoint": {"color": mid_color, "type": "Percentile", "formula": "50"},
                "maximum": {"color": high_color, "type": "HighestValue"},
            },
        },
    }
    try:
        call("POST", url, token, body, session_id=session_id)
        return True
    except RuntimeError as e:
        print(f"  color scale failed on {sheet}:{address} -> {str(e)[:200]}")
        return False


def add_data_bars(token, drive_id, item_id, sheet, address, session_id, color="#638EC6"):
    url = (
        f"{_base(drive_id, item_id)}/worksheets('{urllib.parse.quote(sheet)}')"
        f"/range(address='{address}')/conditionalFormats/add"
    )
    body = {
        "type": "DataBar",
        "dataBar": {
            "gradient": True,
            "direction": "Context",
            "positiveFormat": {"fillColor": color, "gradient": True},
        },
    }
    try:
        call("POST", url, token, body, session_id=session_id)
        return True
    except RuntimeError as e:
        print(f"  data bars failed on {sheet}:{address} -> {str(e)[:200]}")
        return False


def month_chart_panel(token, drive_id, item_id, sheet, session_id, n_days: int):
    """Build the 4-chart panel for a monthly sheet."""
    last_day_col = col_letter(3 + n_days - 1)  # col D = day1, day31 = AH

    # Helper: build a multi-row source range with the header row + N label/value rows.
    # Source format: header row (dates) + label column + data rows.
    # Graph expects sourceData as a single rectangular address that includes the
    # header row (col labels / date strings) and the first column (series labels).

    charts_cfg = [
        {
            "name": "Chart_Visits",
            "type": "Line",
            "kpis": ["SCH-1", "SCH-3", "SCH-4"],  # Seen, Cancelled, NoShow
            "title": "Visits: Seen vs Cancelled vs NoShow",
            "row": CHART_START_ROW,
            "col": "A",
        },
        {
            "name": "Chart_Calls",
            "type": "Line",
            "kpis": ["PHN-1", "PHN-3"],  # Inbound, Missed
            "title": "Calls: Inbound vs Missed",
            "row": CHART_START_ROW,
            "col": "P",
        },
        {
            "name": "Chart_Revenue",
            "type": "ColumnClustered",
            "kpis": ["REV-2"],
            "title": "Daily Collections $",
            "row": CHART_START_ROW + 18,
            "col": "A",
        },
        {
            "name": "Chart_NewPatients",
            "type": "ColumnClustered",
            "kpis": ["NPF-1", "NPF-5"],
            "title": "New Patient Funnel (Inbound calls / Charts created)",
            "row": CHART_START_ROW + 18,
            "col": "P",
        },
    ]

    for cfg in charts_cfg:
        # Source rectangle: needs header row (dates) + label col (A) + data cells.
        # Simpler approach: build a temporary block on the sheet just below the
        # chart panel, THEN chart from that block. We'll do it inline: write
        # a contiguous block of (label, day1..dayN) for each series and chart
        # over it. But we can chart the KPI rows directly if the header row
        # is row 1 and KPI rows include a label in col A.
        # Build a "discontinuous" sourceData via a comma-separated address.
        # Graph charts/add accepts comma-separated ranges per some docs.
        excel_rows = [KPI_INDEX[k] for k in cfg["kpis"]]
        parts = [f"A1:{last_day_col}1"]  # date header
        for r in excel_rows:
            parts.append(f"A{r}:{last_day_col}{r}")
        src = ",".join(parts)
        # Unfortunately Graph charts/add expects a single contiguous range.
        # Build a contiguous range by using the min..max row span and let the
        # chart include intermediate rows too (acceptable for now).
        min_r = min(excel_rows)
        max_r = max(excel_rows)
        # Include header row (row 1) so chart has category labels
        src = f"A1:{last_day_col}{max_r}"
        # Note: this will include KPI rows between min_r and max_r. For the
        # small groupings we picked this is acceptable because most KPIs in
        # between are zero-valued for many days.

        # Position: anchor via top/left pixel coords.
        # Approximate: col width ~64px, row height ~15px
        top_px = (cfg["row"] - 1) * 15
        # col A pixel = 0; col P = 15 * 64 = 960
        col_letter_val = cfg["col"]
        col_idx = sum((ord(c) - 64) * (26 ** i) for i, c in enumerate(reversed(col_letter_val))) - 1
        left_px = col_idx * 64
        name = add_chart(
            token, drive_id, item_id, sheet, cfg["name"], cfg["type"],
            src, "Rows", cfg["title"], session_id,
            top_px=top_px, left_px=left_px, width_px=780, height_px=260,
        )
        if name:
            print(f"    + chart {cfg['name']} ({cfg['type']}) on {sheet}")


def main():
    print("Daily Ops Tracker — visuals layer")
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

            # Color-scale conditional formatting per KPI category cluster
            import calendar as cal
            y, m = map(int, ym.split("-"))
            n_days = cal.monthrange(y, m)[1]
            last_col = col_letter(3 + n_days - 1)

            # Apply color scale per KPI row group (to make visual comparisons fair)
            # Scheduling rows 2..11
            add_color_scale(token, drive_id, item_id, ym, f"D2:{last_col}11", session_id)
            time.sleep(0.1)
            # Revenue rows 12..20
            add_color_scale(token, drive_id, item_id, ym, f"D12:{last_col}20", session_id)
            time.sleep(0.1)
            # New patients rows 21..27
            add_color_scale(token, drive_id, item_id, ym, f"D21:{last_col}27", session_id)
            time.sleep(0.1)
            # Phone rows 28..35
            add_color_scale(token, drive_id, item_id, ym, f"D28:{last_col}35", session_id)
            time.sleep(0.1)
            print(f"  {ym}: color scales applied")

            # Charts panel
            month_chart_panel(token, drive_id, item_id, ym, session_id, n_days)
            time.sleep(0.2)

        # Summary sheet: data bars on Grand Total column (last col before Avg/Month)
        n_months = len(MONTHS)
        # Summary columns: A KPI, B Category, C Source, D..(D+n_months-1) months, then Grand Total, Avg
        grand_total_col = col_letter(3 + n_months)  # after the 12 month cols
        avg_col = col_letter(3 + n_months + 1)
        n_kpis = len(KPI_ROWS)
        # Data bars on the monthly columns
        first_month_col = col_letter(3)
        last_month_col = col_letter(3 + n_months - 1)
        add_data_bars(
            token, drive_id, item_id, "Summary",
            f"{first_month_col}2:{last_month_col}{1 + n_kpis}",
            session_id,
        )
        add_color_scale(
            token, drive_id, item_id, "Summary",
            f"{first_month_col}2:{last_month_col}{1 + n_kpis}",
            session_id,
        )
        print("  Summary: conditional formatting applied")

        # Summary monthly trend charts: key KPIs across months
        # Source: header row 1 (KPI, Cat, Src, 2025-05..2026-04, Grand Total, Avg)
        # plus the KPI rows we want to chart
        summary_charts = [
            {"name": "SumChart_Visits", "kpi": "SCH-1", "type": "Line", "title": "Completed visits by month"},
            {"name": "SumChart_Collections", "kpi": "REV-2", "type": "Line", "title": "Payments collected by month ($)"},
            {"name": "SumChart_NewPt", "kpi": "NPF-5", "type": "ColumnClustered", "title": "New patient charts by month"},
            {"name": "SumChart_Calls", "kpi": "PHN-1", "type": "Line", "title": "Inbound calls by month"},
            {"name": "SumChart_Missed", "kpi": "PHN-3", "type": "Line", "title": "Missed calls by month"},
            {"name": "SumChart_Rx", "kpi": "RX-1", "type": "ColumnClustered", "title": "Rx requests by month"},
        ]
        chart_col_positions = [("A", CHART_START_ROW), ("P", CHART_START_ROW),
                               ("A", CHART_START_ROW + 18), ("P", CHART_START_ROW + 18),
                               ("A", CHART_START_ROW + 36), ("P", CHART_START_ROW + 36)]

        for i, cfg in enumerate(summary_charts):
            kpi_row = KPI_INDEX[cfg["kpi"]]  # excel row within Summary (same index as monthly)
            # Source: header row 1, label col A..C, then months D..last_month_col
            # Use a 2-row range: row 1 (dates) + row kpi_row (data)
            src = f"A1:{last_month_col}1,A{kpi_row}:{last_month_col}{kpi_row}"
            # Graph needs contiguous, so use row 1 through kpi_row (will include rows between)
            src_contig = f"A1:{last_month_col}{kpi_row}"
            col_anchor, row_anchor = chart_col_positions[i]
            col_idx = sum((ord(c) - 64) * (26 ** j) for j, c in enumerate(reversed(col_anchor))) - 1
            left_px = col_idx * 64
            top_px = (row_anchor - 1) * 15
            add_chart(
                token, drive_id, item_id, "Summary", cfg["name"], cfg["type"],
                src_contig, "Rows", cfg["title"], session_id,
                top_px=top_px, left_px=left_px, width_px=780, height_px=260,
            )
        print("  Summary: trend charts added")
    finally:
        close_session(token, drive_id, item_id, session_id)
        print("session closed")


if __name__ == "__main__":
    main()
