"use client";
import useSWR from "swr";
import { useState } from "react";
import type { Snapshot } from "@/lib/types";
import { KpiCard } from "./components/KpiCard";
import { SourceHealthBar } from "./components/SourceHealthBar";
import { ScheduleGrid } from "./components/ScheduleGrid";
import { PhoneActivityCard } from "./components/PhoneActivityCard";
import { FunnelCard } from "./components/FunnelCard";
import { PendingWorkCard } from "./components/PendingWorkCard";
import { RevenueCard } from "./components/RevenueCard";
import { VoicemailCard } from "./components/VoicemailCard";
import { intf, usd, timeAgo } from "@/lib/format";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ApiResp {
  ok: boolean;
  stale?: boolean;
  empty?: boolean;
  snapshot: Snapshot;
}

export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useSWR<ApiResp>(
    "/api/snapshot",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    },
  );
  const [refreshing, setRefreshing] = useState(false);

  const snap: Snapshot | null = data?.snapshot || null;
  const stale = data?.empty || data?.stale;

  async function forceRefresh() {
    setRefreshing(true);
    try {
      await mutate();
    } finally {
      setRefreshing(false);
    }
  }

  async function signOut() {
    await fetch("/api/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  if (isLoading && !snap) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-400">
        Loading snapshot…
      </div>
    );
  }
  if (error || !snap) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        Failed to load snapshot: {(error as Error)?.message || "no data"}
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">
            Exult Healthcare — Daily Ops
          </h1>
          <div className="text-xs text-neutral-400 mt-1">
            {snap.today_date} · {snap.timezone} · refreshed{" "}
            <span className={stale ? "text-amber-400" : "text-neutral-300"}>
              {timeAgo(snap.generated_at)}
            </span>
            {stale && " · stale"}
          </div>
        </div>
        <div className="flex items-start gap-3 flex-wrap justify-end">
          <SourceHealthBar sources={snap.sources} />
          <button
            onClick={forceRefresh}
            disabled={refreshing}
            className="text-xs bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 px-3 py-1.5 rounded border border-neutral-700"
          >
            {refreshing ? "…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1.5"
            title="Sign out"
          >
            sign out
          </button>
        </div>
      </header>

      {/* Hero KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <KpiCard
          label="Visits seen today"
          value={intf(snap.hero.visits_seen_today)}
          sub={`of ${intf(snap.hero.visits_scheduled_today)} scheduled`}
          tone="good"
        />
        <KpiCard
          label="Collections today"
          value={usd(snap.hero.collections_today_usd)}
          sub={`MTD ${usd(snap.hero.collections_mtd_usd)}`}
          tone={snap.hero.collections_today_usd == null ? "muted" : "default"}
        />
        <KpiCard
          label="New patients today"
          value={intf(snap.hero.new_patients_today)}
          sub="from schedule"
          tone={snap.hero.new_patients_today > 0 ? "good" : "default"}
        />
        <KpiCard
          label="Missed calls today"
          value={intf(snap.hero.missed_calls_today)}
          sub={`${intf(snap.phone.today_total)} total calls`}
          tone={snap.hero.missed_calls_today >= 5 ? "bad" : "default"}
        />
        <KpiCard
          label="Yesterday seen"
          value={intf(snap.yesterday.by_status["Seen"] || 0)}
          sub={`${intf(snap.yesterday.total)} sched · ${intf(
            (snap.yesterday.by_status["Cancelled"] || 0) +
              (snap.yesterday.by_status["NoShow"] || 0),
          )} lost`}
          tone="default"
        />
      </section>

      {/* Schedule grids */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ScheduleGrid day={snap.today} title="Today's schedule" />
        <ScheduleGrid day={snap.yesterday} title="Yesterday's schedule" />
      </section>

      {/* Phone + funnel */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <PhoneActivityCard phone={snap.phone} />
        <FunnelCard funnel={snap.funnel} />
      </section>

      {/* Pending / revenue / voicemails */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <PendingWorkCard pending={snap.pending} />
        <RevenueCard revenue={snap.revenue} />
        <VoicemailCard vm={snap.voicemails} />
      </section>

      <footer className="text-[11px] text-neutral-600 mt-6 pb-6">
        Exult Healthcare · McKinney TX · psychiatry clinic · dashboard pulls AMD +
        RingCentral + Microsoft 365 every 5 minutes. PHI suppressed: counts only,
        masked chart and initials.
      </footer>
    </div>
  );
}
