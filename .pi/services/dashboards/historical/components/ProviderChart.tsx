"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
} from "recharts";
import type { Providers } from "@/lib/data";
import { fmtInt, fmtUsd, formatName } from "@/lib/format";

interface Props {
  data: Providers;
}

const BAR_COLORS = [
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
];

export function ProviderChart({ data }: Props) {
  const barData = useMemo(
    () =>
      [...data.rows]
        .sort((a, b) => b.total_visits - a.total_visits)
        .slice(0, 12)
        .map((r) => ({
          name: formatName(r.provider),
          visits: r.total_visits,
          patients: r.unique_patients,
          new_patients: r.new_patients,
          mean_ltv: r.mean_ltv,
          median_ltv: r.median_ltv,
          completed: r.completed,
          noshows: r.noshows,
          no_show_rate:
            r.total_visits > 0 ? (r.noshows as number) / r.total_visits : 0,
        })),
    [data]
  );

  const scatterData = useMemo(
    () =>
      data.rows.map((r) => ({
        name: formatName(r.provider),
        x: r.unique_patients,
        y: r.mean_ltv,
        z: r.total_visits,
      })),
    [data]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)]">
      <div className="card p-4 md:p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <div className="section-heading">Top Providers</div>
            <div className="text-xs text-slate-500">
              Visits across combined visit universe (2025-04 → 2026-04)
            </div>
          </div>
        </div>
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ left: 20, right: 30 }}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.1)" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
                contentStyle={{
                  background: "#020617",
                  border: "1px solid rgba(148,163,184,0.3)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => {
                  if (name === "Visits") return [fmtInt(value), name];
                  return [value, name];
                }}
                labelFormatter={(l) => l as string}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof barData)[number];
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-[11px]">
                      <div className="mb-1 font-semibold text-slate-100">
                        {p.name}
                      </div>
                      <div className="grid grid-cols-[auto,auto] gap-x-4 gap-y-1 text-slate-300">
                        <div className="text-slate-500">Visits</div>
                        <div className="text-right">{fmtInt(p.visits)}</div>
                        <div className="text-slate-500">Unique patients</div>
                        <div className="text-right">{fmtInt(p.patients)}</div>
                        <div className="text-slate-500">New patients</div>
                        <div className="text-right">
                          {fmtInt(p.new_patients)}
                        </div>
                        <div className="text-slate-500">Completed</div>
                        <div className="text-right">{fmtInt(p.completed)}</div>
                        <div className="text-slate-500">No-shows</div>
                        <div className="text-right">
                          {fmtInt(p.noshows)} ·{" "}
                          {(p.no_show_rate * 100).toFixed(1)}%
                        </div>
                        <div className="text-slate-500">Mean LTV</div>
                        <div className="text-right text-emerald-300">
                          {fmtUsd(p.mean_ltv)}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="visits"
                name="Visits"
                radius={[0, 6, 6, 0]}
              >
                {barData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4 md:p-6">
        <div className="mb-3">
          <div className="section-heading">Unique Patients vs LTV</div>
          <div className="text-xs text-slate-500">
            Bubble size = visit volume
          </div>
        </div>
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.1)" />
              <XAxis
                dataKey="x"
                name="Unique patients"
                type="number"
                label={{
                  value: "Unique patients",
                  position: "insideBottom",
                  offset: -2,
                  fill: "#94a3b8",
                  fontSize: 11,
                }}
              />
              <YAxis
                dataKey="y"
                name="Mean LTV"
                type="number"
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              />
              <ZAxis dataKey="z" range={[60, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof scatterData)[number];
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-950/95 p-2 text-[11px] text-slate-200">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-slate-400">
                        {fmtInt(p.x)} patients · {fmtUsd(p.y)} LTV ·{" "}
                        {fmtInt(p.z)} visits
                      </div>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData} fill="#38bdf8" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
