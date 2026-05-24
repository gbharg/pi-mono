---
description: "Use when analyzing billing data, generating financial reports, reviewing charges/payments, or creating KPI dashboards."
allowed-tools:
  - Bash(python3 *)
  - Read
  - Grep
  - Glob
---

# /finance -- Billing and Financial Reporting

## Data Paths

| Path                                      | Format  | Contents                            |
|-------------------------------------------|---------|-------------------------------------|
| ~/claude-workspace/data/cohort_analysis/  | Parquet | Patient cohort data, visit history  |
| ~/claude-workspace/data/daily_tracker/    | JSON    | Daily operational metrics           |
| ~/claude-workspace/reports/               | Various | Generated reports (xlsx, pdf)       |

## Fee Schedule

- New patient visit: $375
- Follow-up visit: $175
- These are self-pay rates (not published on website)

## Working with Parquet Files

```python
import pandas as pd

# Read a parquet file
df = pd.read_parquet("~/claude-workspace/data/cohort_analysis/visits.parquet")

# Common operations
df.groupby("provider")["charge_amount"].sum()
df[df["visit_date"] >= "2026-01-01"].describe()
```

Requires `pandas` and `pyarrow` (both installed).

## Report Generation

When creating reports:
1. Load data from parquet/JSON sources
2. Build analysis in pandas
3. Export to Excel using openpyxl (see /excel skill)
4. Include both raw data tables AND charts -- never replace data with charts alone

## Daily Tracker Schema

```json
{
  "date": "2026-04-12",
  "calls_inbound": 42,
  "calls_outbound": 15,
  "appointments_scheduled": 8,
  "appointments_completed": 6,
  "no_shows": 1,
  "revenue_collected": 1750.00
}
```

## Gotchas

- **Keep raw data alongside charts.** Gautam requires both. Never create a workbook with only charts -- the underlying data tables must be visible on the same sheet or an adjacent sheet.
- **Self-pay rates are not public.** Do not include fee schedule in patient-facing documents.
- **Parquet files need pandas/pyarrow.** Always use python3 with pandas to read parquet. Do not try to read them as text.
- **Date ranges.** Always confirm the date range before generating reports. AMD fiscal periods may not align with calendar months.

## Reference Docs

See `references/data-schema.md` for detailed parquet file schemas and field descriptions.

## Subagent Guidelines

When spawned as a subagent for finance tasks:
- Report progress via SendMessage at: task start, after data extraction, after analysis, and on completion.
- Always include key financial numbers in updates (revenue, charge totals, payment counts).
- Keep raw data tables visible alongside charts -- never replace data with chart-only views.
- Self-pay rates ($375 new, $175 follow-up) are not public. Do not include in patient-facing docs.
- Use /excel skill for workbook creation. Use openpyxl for Excel output.
