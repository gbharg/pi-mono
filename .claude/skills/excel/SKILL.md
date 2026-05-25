---
name: excel
description: "Use when reading or editing Excel workbooks stored in OneDrive/SharePoint (cloud), or building local .xlsx files. Covers finding a workbook by name, reading/writing ranges, managing tables, charts, and formatting via the Microsoft 365 MCP tools."
allowed-tools:
  - Bash(python3 *)
  - Bash(curl *)
  - Bash(jq *)
  - Read
  - Write
---

# /excel — Excel Operations

Three tiers, in order of preference for cloud workbooks:

1. **`mcp__ms365__*-excel-*` MCP tools** — preferred for OneDrive/SharePoint. Schemas are deferred; load them with `ToolSearch({ query: "+excel ms365", max_results: 30 })` before first use.
2. **Graph API via curl** — fallback when MCP isn't loaded, or for batch scripts. Uses app-only auth from `config/credentials/microsoft365.json`.
3. **`openpyxl`** — for local `.xlsx` (no cloud), bulk generation (>10k rows), or when the file isn't yet in OneDrive. Upload after with `mcp__ms365__upload-file-content`.

Default mailbox/drive owner: `gautam@exulthealthcare.com`. For SharePoint sites, use the site-scoped tools.

---

## Cloud playbook (MCP)

Editing a cloud workbook is a 4-step pattern: **find → orient → read → write**. Skip steps you already have IDs for.

### 1. Find the workbook

You need a `driveId` and `itemId` to address it. If the user gave you a name (e.g. "Q1 Revenue"), search:

```
mcp__ms365__search-onedrive-files({ query: "Q1 Revenue" })
```

For SharePoint sites: `search-sharepoint-sites` → `list-sharepoint-site-drives` → `list-folder-files`.

Cache the IDs in conversation memory — don't re-search on every call.

### 2. Orient: list sheets and tables

```
mcp__ms365__list-excel-worksheets({ driveId, itemId })
mcp__ms365__list-excel-tables({ driveId, itemId })
```

Prefer named tables over raw ranges when they exist — table operations (add row, update row, sort) are safer because they don't require recomputing addresses when rows shift.

### 3. Read before you write

Always read the target range first to confirm shape and current values. `update-excel-range` is destructive — wrong shape silently overwrites neighbors.

```
mcp__ms365__get-excel-range({ driveId, itemId, worksheetId: "Sheet1", address: "A1:D10" })
```

The response includes `values` (2D array), `text` (formatted strings), `formulas`, `numberFormat`, and `address`. Confirm `address` matches what you asked for before writing.

### 4. Write

**Range update** (overwrite cells):
```
mcp__ms365__update-excel-range({
  driveId, itemId, worksheetId: "Sheet1",
  address: "A1:C3",
  values: [["Date","Visits","Revenue"],["2026-04-01",12,2100],["2026-04-02",15,2625]]
})
```
- `values` shape MUST match `address`. 3 rows × 3 cols → 3×3 array.
- Numbers stay numeric — don't quote them or you lose number formatting.
- Use `null` to leave a cell unchanged inside a larger overwrite.

**Table row** (preferred when a table exists):
```
mcp__ms365__add-excel-table-rows({ driveId, itemId, tableId, values: [[...], [...]] })
mcp__ms365__update-excel-table-row({ driveId, itemId, tableId, index, values: [...] })
mcp__ms365__delete-excel-table-row({ driveId, itemId, tableId, index })
```

**Insert / delete cells** (shift rows or columns):
```
mcp__ms365__insert-excel-range({ driveId, itemId, worksheetId, address, shift: "Down" | "Right" })
mcp__ms365__delete-excel-range({ driveId, itemId, worksheetId, address, shift: "Up" | "Left" })
```

**Format / sort**:
```
mcp__ms365__format-excel-range({ driveId, itemId, worksheetId, address, format: { numberFormat: "$#,##0.00", bold: true } })
mcp__ms365__sort-excel-range({ driveId, itemId, worksheetId, address, fields: [{ key: 0, ascending: false }] })
```

**Charts**:
```
mcp__ms365__create-excel-chart({ driveId, itemId, worksheetId, chartType: "ColumnClustered", sourceData: "A1:C10", seriesBy: "Auto" })
```
Always keep raw data visible alongside the chart — never let a chart replace its source range.

### 5. Verify after writing

Re-read the range you just wrote. Off-by-one addresses, wrong sheet, and shape mismatches are the top sources of silent bugs.

---

## Graph API fallback (curl)

When MCP tools aren't loaded, hit Graph directly. Fetch an app-only token from credentials:

```bash
TOKEN=$(python3 -c "
import json,urllib.request,urllib.parse
c=json.load(open('config/credentials/microsoft365.json'))
data=urllib.parse.urlencode({'client_id':c['client_id'],'client_secret':c['client_secret'],'scope':'https://graph.microsoft.com/.default','grant_type':'client_credentials'}).encode()
r=urllib.request.urlopen(f\"https://login.microsoftonline.com/{c['tenant_id']}/oauth2/v2.0/token\",data)
print(json.loads(r.read())['access_token'])
")
```

Find a file by name:
```bash
curl -s "https://graph.microsoft.com/v1.0/users/gautam@exulthealthcare.com/drive/root/search(q='Q1+Revenue')" \
  -H "Authorization: Bearer $TOKEN" | jq '.value[] | {name, id, webUrl}'
```

Read a range:
```bash
curl -s "https://graph.microsoft.com/v1.0/users/gautam@exulthealthcare.com/drive/items/$ITEM_ID/workbook/worksheets('Sheet1')/range(address='A1:D10')" \
  -H "Authorization: Bearer $TOKEN" | jq .values
```

Write a range:
```bash
curl -s -X PATCH "https://graph.microsoft.com/v1.0/users/gautam@exulthealthcare.com/drive/items/$ITEM_ID/workbook/worksheets('Sheet1')/range(address='A1:C3')" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"values":[["Date","Visits","Revenue"],["2026-04-01",12,2100],["2026-04-02",15,2625]]}'
```

For long edit sessions, open a workbook session with `persistChanges=true` and pass the returned `workbook-session-id` header on subsequent calls — batches edits and is much faster than per-call writes.

---

## Local `.xlsx` (openpyxl)

Use for >10k rows, complex chart layouts, or when starting from scratch before upload.

```python
from openpyxl import Workbook, load_workbook
from openpyxl.chart import BarChart, Reference

wb = Workbook()
ws = wb.active
ws.title = "Q1 Revenue"
ws.append(["Date", "Visits", "Revenue"])
ws.append(["2026-04-01", 12, 2100])
ws.append(["2026-04-02", 15, 2625])

for cell in ws["C"][1:]:
    cell.number_format = '"$"#,##0.00'

chart = BarChart()
chart.title = "Daily Revenue"
data = Reference(ws, min_col=3, min_row=1, max_row=ws.max_row)
cats = Reference(ws, min_col=1, min_row=2, max_row=ws.max_row)
chart.add_data(data, titles_from_data=True)
chart.set_categories(cats)
ws.add_chart(chart, "E2")

wb.save("/tmp/q1-revenue.xlsx")
```

Upload to OneDrive:
```
mcp__ms365__upload-file-content({ parentItemId, fileName: "Q1 Revenue.xlsx", contentBase64: "<base64 of file>" })
```

For files >4MB, use `create-upload-session` instead.

---

## Hard rules

- **Read before write.** Confirm range shape and current contents. `update-excel-range` overwrites silently.
- **Match `values` shape to `address` exactly.** A 3-row write into a 2-row address fails or truncates.
- **Numbers stay numbers.** Don't stringify numeric data — number formats only apply to numeric cells.
- **Charts never hide data.** Place charts adjacent to the source range.
- **Verify after writing.** Re-read the range and diff against intent.
- **Descriptive sheet names.** "Q1 Revenue", "Patient Visits" — never leave "Sheet1".
- **Cache `driveId` + `itemId`** after the first lookup; don't re-search.

## Reference

`references/excel-recipes.md` — pivot tables, conditional formatting, multi-sheet patterns, workbook sessions, common error responses.
