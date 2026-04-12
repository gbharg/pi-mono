"use client";
import type { NewPatientFunnel } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface Props {
  funnel: NewPatientFunnel;
}

export function FunnelCard({ funnel }: Props) {
  const today = funnel.today;
  const stages = [
    { name: "Inquiries", value: today.inquiries, color: "#60a5fa" },
    { name: "Booked", value: today.booked, color: "#a78bfa" },
    { name: "Arrived", value: today.arrived, color: "#34d399" },
    { name: "1st Charge", value: today.first_charge, color: "#fbbf24" },
  ];
  const max = Math.max(1, ...stages.map((s) => s.value));

  const series30 = funnel.last_30d.slice(-30).map((d) => ({
    date: d.date.slice(5),
    Inquiries: d.inquiries,
    Booked: d.booked,
    Arrived: d.arrived,
  }));

  return (
    <div className="card">
      <div className="flex items-baseline justify-between">
        <div className="card-title">New Patient Funnel</div>
        <div className="text-xs text-neutral-400">
          {funnel.conversion_inquiry_to_booked_pct != null
            ? `inquiry→booked ${funnel.conversion_inquiry_to_booked_pct.toFixed(0)}%`
            : ""}
        </div>
      </div>

      <div className="space-y-1 mt-2">
        {stages.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <div className="text-xs text-neutral-400 w-20">{s.name}</div>
            <div className="flex-1 bg-neutral-800 rounded h-5 overflow-hidden">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${(s.value / max) * 100}%`,
                  background: s.color,
                }}
              />
            </div>
            <div className="text-sm tabular-nums w-8 text-right text-neutral-200">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {series30.length > 0 && (
        <div className="h-32 mt-3 border-t border-neutral-800 pt-2">
          <div className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
            Last 30d
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={series30} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#737373" fontSize={10} tickLine={false} interval={4} />
              <YAxis allowDecimals={false} stroke="#737373" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid #262626",
                  fontSize: 11,
                  borderRadius: 6,
                }}
                labelStyle={{ color: "#a3a3a3" }}
              />
              <Bar dataKey="Inquiries" fill="#60a5fa" />
              <Bar dataKey="Booked" fill="#a78bfa" />
              <Bar dataKey="Arrived" fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
