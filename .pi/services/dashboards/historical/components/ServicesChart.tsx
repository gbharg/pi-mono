"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { Services } from "@/lib/data";
import { fmtCompactUsd, fmtInt, fmtPct, fmtUsd } from "@/lib/format";

interface Props {
  data: Services;
}

const COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#facc15",
  "#f97316",
  "#60a5fa",
  "#fb7185",
  "#c084fc",
  "#22d3ee",
  "#4ade80",
  "#e879f9",
  "#94a3b8",
  "#fcd34d",
];

export function ServicesChart({ data }: Props) {
  const pieData = data.categories.map((c) => ({
    name: c.category,
    value: c.gross,
  }));
  const totalGross = pieData.reduce((acc, r) => acc + r.value, 0);
  const totalCollected = data.categories.reduce(
    (acc, r) => acc + r.collected,
    0
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,1.1fr)]">
      <div className="card p-4 md:p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <div className="section-heading">Revenue Mix</div>
            <div className="text-xs text-slate-500">
              Gross charges by CPT category
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500">Gross tracked</div>
            <div className="text-sm font-semibold text-slate-100">
              {fmtCompactUsd(totalGross)}
            </div>
          </div>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={70}
                outerRadius={120}
                paddingAngle={1}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${fmtUsd(v)} · ${fmtPct(v / totalGross)}`,
                  name,
                ]}
                contentStyle={{
                  background: "#020617",
                  border: "1px solid rgba(148,163,184,0.3)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, color: "#94a3b8" }}
                layout="vertical"
                align="right"
                verticalAlign="middle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4 md:p-6">
        <div className="mb-3">
          <div className="section-heading">Patients per CPT Category</div>
          <div className="text-xs text-slate-500">
            How many distinct patients received each service?
          </div>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.categories.slice().sort(
                (a, b) => b.unique_patients - a.unique_patients
              )}
              layout="vertical"
              margin={{ left: 30, right: 30 }}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.1)" />
              <XAxis type="number" />
              <YAxis
                dataKey="category"
                type="category"
                tick={{ fontSize: 10 }}
                width={160}
              />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
                contentStyle={{
                  background: "#020617",
                  border: "1px solid rgba(148,163,184,0.3)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [fmtInt(v), "Unique patients"]}
              />
              <Bar
                dataKey="unique_patients"
                fill="#a78bfa"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card col-span-full overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-800 p-4 md:p-6">
          <div>
            <div className="section-heading">Top procedure codes</div>
            <div className="mt-1 text-xs text-slate-500">
              Highest-gross CPT codes · collected /{" "}
              {fmtUsd(totalCollected, 0)} across tracked charges
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[11px]">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 text-right">Charges</th>
                <th className="px-4 py-2 text-right">Patients</th>
                <th className="px-4 py-2 text-right">Gross</th>
                <th className="px-4 py-2 text-right">Collected</th>
                <th className="px-4 py-2 text-right">NCR</th>
              </tr>
            </thead>
            <tbody>
              {data.top_codes.map((c) => (
                <tr
                  key={c.proc_code}
                  className="border-t border-slate-900/60 hover:bg-slate-900/40"
                >
                  <td className="px-4 py-2 font-mono text-slate-200">
                    {c.proc_code}
                  </td>
                  <td className="px-4 py-2 text-slate-300">
                    {c.description}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-300">
                    {fmtInt(c.charge_count)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-300">
                    {fmtInt(c.unique_patients)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-100">
                    {fmtUsd(c.gross)}
                  </td>
                  <td className="px-4 py-2 text-right text-emerald-300">
                    {fmtUsd(c.collected)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-400">
                    {c.gross > 0
                      ? fmtPct(c.collected / c.gross, 1)
                      : "—"}
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
