# Excel Recipes

Worked examples for the patterns described in `SKILL.md`. MCP tool names are abbreviated (`update-excel-range` → `mcp__ms365__update-excel-range`).

## Cloud — end-to-end edit

Update revenue for two specific dates in "Q1 Revenue.xlsx", verify, and chart.

```
// 1. find
search-onedrive-files({ query: "Q1 Revenue" })
// → { driveId: "b!abc...", id: "01XYZ..." }

// 2. orient
list-excel-worksheets({ driveId, itemId })
// → [{ id: "Sheet1", name: "Daily" }, ...]

// 3. read context (10 rows around the target)
get-excel-range({ driveId, itemId, worksheetId: "Daily", address: "A1:C10" })
// → values: [["Date","Visits","Revenue"],["2026-04-01",12,2100],...]

// 4. write — only the two cells we want to change
update-excel-range({
  driveId, itemId, worksheetId: "Daily",
  address: "C2:C3",
  values: [[2400], [2900]]
})

// 5. verify
get-excel-range({ driveId, itemId, worksheetId: "Daily", address: "C2:C3" })
```

## Cloud — append rows to a named table

When the workbook has a table called `RevenueTable`, append safely without computing addresses:

```
list-excel-tables({ driveId, itemId })
// → [{ id: "{guid}", name: "RevenueTable", range: "A1:C50" }]

add-excel-table-rows({
  driveId, itemId, tableId: "{guid}",
  values: [
    ["2026-04-15", 18, 3150],
    ["2026-04-16", 14, 2450]
  ]
})
```

## Cloud — create a chart adjacent to data

```
create-excel-chart({
  driveId, itemId, worksheetId: "Daily",
  chartType: "ColumnClustered",
  sourceData: "A1:C10",
  seriesBy: "Auto"
})
```

After creation, the chart can be repositioned by editing its `top`/`left` properties via the Graph API directly — most use cases just leave it where Excel places it (top-right of the source range).

## Cloud — currency formatting

```
format-excel-range({
  driveId, itemId, worksheetId: "Daily",
  address: "C2:C100",
  format: { numberFormat: "$#,##0.00" }
})
```

Common formats:
- Currency: `"$#,##0.00"`
- Percent: `"0.00%"`
- Date: `"yyyy-mm-dd"`
- Thousands: `"#,##0"`

## Cloud — sort by a column

Sort `A1:C50` descending by column C (revenue):

```
sort-excel-range({
  driveId, itemId, worksheetId: "Daily",
  address: "A1:C50",
  fields: [{ key: 2, ascending: false }],
  hasHeaders: true
})
```

`key` is the 0-indexed column within the range, not the absolute column letter.

## Graph API — long edit session

For 10+ writes in a row, open a session once instead of paying per-call latency:

```bash
SESSION=$(curl -s -X POST \
  "https://graph.microsoft.com/v1.0/users/gautam@exulthealthcare.com/drive/items/$ITEM_ID/workbook/createSession" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"persistChanges": true}' | jq -r .id)

# All subsequent writes use this header:
curl -s -X PATCH "...range(address='A1:C3')" \
  -H "Authorization: Bearer $TOKEN" \
  -H "workbook-session-id: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{"values":[...]}'

# Close when done
curl -s -X POST "https://graph.microsoft.com/v1.0/users/gautam@exulthealthcare.com/drive/items/$ITEM_ID/workbook/closeSession" \
  -H "Authorization: Bearer $TOKEN" \
  -H "workbook-session-id: $SESSION"
```

## openpyxl — local workbook with chart

```python
from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference

wb = Workbook()
ws = wb.active
ws.title = "Daily"

ws.append(["Date", "Appointments", "Calls", "Emails"])
for row in [
    ["2026-04-01", 12, 34, 8],
    ["2026-04-02", 15, 28, 11],
]:
    ws.append(row)

chart = BarChart()
chart.title = "Daily Metrics"
chart.x_axis.title = "Date"
chart.y_axis.title = "Count"
data_ref = Reference(ws, min_col=2, max_col=4, min_row=1, max_row=ws.max_row)
cats = Reference(ws, min_col=1, min_row=2, max_row=ws.max_row)
chart.add_data(data_ref, titles_from_data=True)
chart.set_categories(cats)
ws.add_chart(chart, "F2")

wb.save("/tmp/output.xlsx")
```

## openpyxl — read and update existing

```python
from openpyxl import load_workbook

wb = load_workbook("existing.xlsx")
ws = wb["Sheet1"]
ws["A1"] = "Updated Value"
wb.save("existing.xlsx")
```

## Common error responses (Graph)

| Status | Meaning | Fix |
|--------|---------|-----|
| 400 `InvalidArgument` | `values` shape doesn't match `address` | Recount rows × cols |
| 404 `ItemNotFound` | Wrong `itemId` or `worksheetId` | Re-run `list-excel-worksheets` |
| 409 `AccessDenied` | Workbook is locked open in desktop Excel | Ask user to close it, or use a session with `persistChanges=true` |
| 423 `Locked` | Concurrent edit by another session | Retry after 1–2s |
| 504 | Workbook recalc timeout | Reduce range size, or split write across smaller ranges |

## Gotchas

- `update-excel-range` overwrites silently — read first, verify shape.
- Numeric strings (`"2100"` vs `2100`) lose number formatting. Send numbers as numbers.
- openpyxl does not support `.xls` (legacy format) — only `.xlsx`.
- Charts created via Graph land at a default position; precise placement requires a follow-up PATCH to the chart's `position` property.
- Workbook sessions expire after ~5 minutes of inactivity. Refresh by re-creating, not by extending.
