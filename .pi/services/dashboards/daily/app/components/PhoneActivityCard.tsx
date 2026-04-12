"use client";
import type { PhoneActivity } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { intf } from "@/lib/format";

interface Props {
  phone: PhoneActivity;
}

export function PhoneActivityCard({ phone }: Props) {
  const chartData = phone.last4h_buckets.map((b) => ({
    t: new Date(b.bucket_start).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
    }),
    Inbound: b.inbound,
    Outbound: b.outbound,
    Missed: b.missed,
  }));

  return (
    <div className="card">
      <div className="flex items-baseline justify-between">
        <div className="card-title">Phone activity · last 4h</div>
        <div className="text-xs text-neutral-400">
          Today: {intf(phone.today_total)} calls ·{" "}
          <span className="text-red-400">
            {intf(phone.today_missed)} missed
          </span>
        </div>
      </div>
      <div className="h-48 mt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
            No call activity in the last 4 hours.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke="#737373" fontSize={11} tickLine={false} />
              <YAxis allowDecimals={false} stroke="#737373" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid #262626",
                  fontSize: 12,
                  borderRadius: 6,
                }}
                labelStyle={{ color: "#a3a3a3" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Inbound" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Outbound" stroke="#60a5fa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Missed" stroke="#f87171" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {phone.recent_missed.length > 0 && (
        <div className="mt-3 border-t border-neutral-800 pt-2">
          <div className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
            Recent missed ({phone.recent_missed.length})
          </div>
          <ul className="text-xs font-mono space-y-0.5 max-h-28 overflow-y-auto">
            {phone.recent_missed.map((m, i) => (
              <li key={i} className="flex justify-between text-neutral-300">
                <span>{m.masked_number}</span>
                <span className="text-neutral-500">
                  {new Date(m.at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/Chicago",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
