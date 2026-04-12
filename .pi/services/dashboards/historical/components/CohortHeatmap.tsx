"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
} from "recharts";
import type { CohortRetention } from "@/lib/data";
import { fmtInt, fmtPct } from "@/lib/format";

interface Props {
  data: CohortRetention;
}

const HIGHLIGHTED_COHORTS = ["2025-05", "2025-07", "2025-10", "2026-01"];

function colorForPct(pct: number | null): string {
  if (pct === null) return "rgba(30,41,59,0.3)";
  // green = high, red = low
  const clamped = Math.max(0, Math.min(1, pct));
  const g = Math.round(48 + 160 * clamped);
  const r = Math.round(220 - 170 * clamped);
  const b = Math.round(90 + 30 * clamped);
  return `rgba(${r},${g},${b},${0.18 + 0.6 * clamped})`;
}

export function CohortHeatmap({ data }: Props) {
  const [hover, setHover] = useState<null | {
    x: number;
    y: number;
    cohort: string;
    age: number;
    count: number;
    pct: number;
    size: number;
  }>(null);

  const maxAge = data.max_age_shown;
  const ages = useMemo(
    () => Array.from({ length: maxAge + 1 }, (_, i) => i),
    [maxAge]
  );

  const lineData = useMemo(() => {
    const rows = ages.map((age) => {
      const row: Record<string, number | string | null> = { age: `M${age}` };
      for (const cohort of HIGHLIGHTED_COHORTS) {
        const c = data.cohorts.find((c) => c.cohort_month === cohort);
        if (!c) {
          row[cohort] = null;
          continue;
        }
        const cell = c.cells[age];
        row[cohort] = cell && cell.status === "actual" ? (cell.pct ?? 0) * 100 : null;
      }
      return row;
    });
    return rows;
  }, [data, ages]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)]">
      <div className="card p-4 md:p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <div className="section-heading">Retention Matrix</div>
            <div className="text-xs text-slate-500">
              % of cohort returning at month N
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>low</span>
            <div className="h-2 w-32 rounded-full bg-gradient-to-r from-rose-500/60 via-amber-400/60 to-emerald-400/70" />
            <span>high</span>
          </div>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-[11px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card pr-2 text-left font-medium text-slate-400">
                  Cohort
                </th>
                <th className="pr-2 text-right font-medium text-slate-400">
                  Size
                </th>
                {ages.map((a) => (
                  <th key={a} className="text-center font-medium text-slate-500">
                    M{a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((c) => (
                <tr key={c.cohort_month}>
                  <td className="sticky left-0 z-10 bg-card pr-2 py-1 font-medium text-slate-200">
                    {c.cohort_month}
                  </td>
                  <td className="pr-2 text-right text-slate-400">
                    {fmtInt(c.cohort_size)}
                  </td>
                  {c.cells.map((cell) => {
                    const isFuture = cell.status === "future";
                    return (
                      <td
                        key={cell.age}
                        className="p-0 text-center"
                        onMouseEnter={(e) => {
                          if (isFuture || cell.count === null) return;
                          const rect = (
                            e.target as HTMLElement
                          ).getBoundingClientRect();
                          setHover({
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                            cohort: c.cohort_month,
                            age: cell.age,
                            count: cell.count!,
                            pct: cell.pct!,
                            size: c.cohort_size,
                          });
                        }}
                        onMouseLeave={() => setHover(null)}
                      >
                        <div
                          className="mx-auto flex h-7 min-w-[38px] items-center justify-center rounded-md text-[10px] font-medium"
                          style={{
                            background: isFuture
                              ? "rgba(30,41,59,0.3)"
                              : colorForPct(cell.pct ?? 0),
                            color: isFuture
                              ? "rgba(148,163,184,0.3)"
                              : (cell.pct ?? 0) > 0.45
                                ? "#052e16"
                                : "#f8fafc",
                          }}
                        >
                          {isFuture ? "—" : fmtPct(cell.pct ?? 0, 0)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {hover && (
            <div
              className="cell-tooltip"
              style={{
                left: hover.x - 60,
                top: hover.y - 54,
              }}
            >
              <div className="font-medium">
                {hover.cohort} · M{hover.age}
              </div>
              <div className="text-slate-400">
                {fmtInt(hover.count)} of {fmtInt(hover.size)} ·{" "}
                {fmtPct(hover.pct)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 md:p-6">
        <div className="mb-2 flex items-baseline justify-between">
          <div>
            <div className="section-heading">Retention Curves</div>
            <div className="text-xs text-slate-500">
              May / Jul / Oct 2025, Jan 2026
            </div>
          </div>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="age" />
              <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "#020617",
                  border: "1px solid rgba(148,163,184,0.3)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) =>
                  typeof v === "number" ? `${v.toFixed(1)}%` : "—"
                }
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
                iconType="circle"
              />
              {HIGHLIGHTED_COHORTS.map((c, i) => (
                <Line
                  key={c}
                  type="monotone"
                  dataKey={c}
                  stroke={
                    ["#38bdf8", "#a78bfa", "#f472b6", "#34d399"][i % 4]
                  }
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
