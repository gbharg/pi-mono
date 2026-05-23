"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { RevenueWaterfall } from "@/lib/data";
import { fmtCompactUsd, fmtUsd } from "@/lib/format";

interface Props {
  data: RevenueWaterfall;
}

export function WaterfallChart({ data }: Props) {
  const gross = data.gross_billed;
  const writeoffs = data.writeoffs;
  const outstanding = data.outstanding;
  const collected = data.collected;

  // Running total for waterfall steps
  const steps = [
    { name: "Gross Billed", base: 0, value: gross, color: "#38bdf8" },
    {
      name: "Write-offs",
      base: gross - writeoffs,
      value: writeoffs,
      color: "#f87171",
    },
    {
      name: "Outstanding",
      base: gross - writeoffs - outstanding,
      value: outstanding,
      color: "#fbbf24",
    },
    { name: "Collected", base: 0, value: collected, color: "#34d399" },
  ];

  return (
    <div className="card p-4 md:p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="section-heading">Revenue Waterfall</div>
          <div className="text-xs text-slate-500">
            From gross charges to actual cash collected
          </div>
        </div>
        <div className="flex gap-6 text-[11px] text-slate-400">
          <div>
            Net collection rate:{" "}
            <span className="font-semibold text-emerald-300">
              {((collected / gross) * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            Write-off rate:{" "}
            <span className="font-semibold text-rose-300">
              {((writeoffs / gross) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={steps}>
            <CartesianGrid stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(v) => fmtCompactUsd(v)} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.05)" }}
              contentStyle={{
                background: "#020617",
                border: "1px solid rgba(148,163,184,0.3)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, name: string, p: any) => {
                if (name === "base") return null as unknown as string;
                return [fmtUsd(v), "Amount"];
              }}
              labelFormatter={(l) => l as string}
            />
            <Bar dataKey="base" stackId="a" fill="transparent" />
            <Bar dataKey="value" stackId="a" radius={[6, 6, 0, 0]}>
              {steps.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {steps.map((s) => (
          <div
            key={s.name}
            className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3"
          >
            <div
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: s.color }}
            >
              {s.name}
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-100">
              {fmtUsd(s.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
