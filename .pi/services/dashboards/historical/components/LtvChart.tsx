"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CohortLtv } from "@/lib/data";
import { fmtCompactUsd, fmtInt, fmtUsd } from "@/lib/format";

interface Props {
  data: CohortLtv;
}

export function LtvChart({ data }: Props) {
  const rows = data.rows.map((r) => ({
    cohort: r.cohort_month,
    size: r.cohort_size,
    mean_billed: r.mean_ltv_billed ?? 0,
    mean_all: r.mean_ltv_all,
    median: r.median_ltv,
    p90: r.p90_ltv_billed ?? 0,
  }));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
      <div className="card p-4 md:p-6">
        <div className="mb-3">
          <div className="section-heading">Mean LTV by Cohort</div>
          <div className="text-xs text-slate-500">
            Collected payments per patient · bars = billed-patient mean, line =
            cohort size
          </div>
        </div>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows}>
              <CartesianGrid stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="cohort" />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => fmtCompactUsd(v)}
              />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid rgba(148,163,184,0.3)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => {
                  if (name === "Cohort size") return [fmtInt(v), name];
                  return [fmtUsd(v), name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
                iconType="circle"
              />
              <Bar
                yAxisId="left"
                dataKey="mean_billed"
                name="Mean LTV (billed)"
                fill="#38bdf8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="median"
                name="Median LTV"
                fill="#a78bfa"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="size"
                name="Cohort size"
                stroke="#facc15"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-slate-800 p-4 md:p-6">
          <div className="section-heading">Cohort table</div>
          <div className="mt-1 text-xs text-slate-500">
            Totals from billed patients (tx_summary).
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-2">Cohort</th>
                <th className="px-4 py-2 text-right">Size</th>
                <th className="px-4 py-2 text-right">Billed</th>
                <th className="px-4 py-2 text-right">Mean LTV</th>
                <th className="px-4 py-2 text-right">Median</th>
                <th className="px-4 py-2 text-right">P90</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr
                  key={r.cohort_month}
                  className="border-t border-slate-900/60 hover:bg-slate-900/40"
                >
                  <td className="px-4 py-2 font-medium text-slate-200">
                    {r.cohort_month}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-300">
                    {fmtInt(r.cohort_size)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-300">
                    {fmtInt(r.billed_patients as number)}
                  </td>
                  <td className="px-4 py-2 text-right text-emerald-300">
                    {fmtUsd(r.mean_ltv_billed ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-300">
                    {fmtUsd(r.median_ltv)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-300">
                    {fmtUsd(r.p90_ltv_billed ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
