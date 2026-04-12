import { data } from "@/lib/data";
import { KpiTile } from "@/components/KpiTile";
import { Section } from "@/components/Section";
import { CohortHeatmap } from "@/components/CohortHeatmap";
import { LtvChart } from "@/components/LtvChart";
import { ProviderChart } from "@/components/ProviderChart";
import { ServicesChart } from "@/components/ServicesChart";
import { LocationCompare } from "@/components/LocationCompare";
import { WaterfallChart } from "@/components/WaterfallChart";
import { fmtCompactUsd, fmtInt, fmtPct } from "@/lib/format";

export default function DashboardPage() {
  const {
    kpis,
    cohortRetention,
    cohortLtv,
    providers,
    services,
    locations,
    revenueWaterfall,
    dataQuality,
    meta,
  } = data;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <Hero kpis={kpis} meta={meta} />

      <Section
        id="shells"
        eyebrow="Data hygiene alert"
        title="992 shell accounts detected"
        description="Of 1,742 patients in the financial ledger, 992 have $0 lifetime charges. These are likely intake failures, duplicates, or never-billed shell records — a primary cleanup target before any AR-related tooling ships."
      >
        <ShellCallout kpis={kpis} />
      </Section>

      <Section
        id="cohort"
        eyebrow="Cohort retention"
        title="Monthly cohorts, visit-level retention"
        description="Each cohort = patients whose first visit fell in that month. Cells show % of the cohort returning at month N. Blanks = future months (snapshot is 2026-04-10)."
      >
        <CohortHeatmap data={cohortRetention} />
      </Section>

      <Section
        id="ltv"
        eyebrow="Lifetime Value"
        title="Collected payments per patient by cohort"
        description="Mean LTV uses only billed patients (shell accounts excluded). Median + P90 highlight how skewed the distribution is — a few heavy users carry a lot of each cohort."
      >
        <LtvChart data={cohortLtv} />
      </Section>

      <Section
        id="providers"
        eyebrow="Provider performance"
        title="Who drove the volume — and the revenue?"
        description="Volume leaders aren't always the revenue leaders. Hover a bar for the full provider profile. The scatter on the right correlates patient volume with average LTV."
      >
        <ProviderChart data={providers} />
      </Section>

      <Section
        id="services"
        eyebrow="Service mix"
        title="CPT revenue breakdown"
        description="99214T (E&M established, telehealth, 30min) is the engine of the practice — over $970k in gross charges on ~3,200 line items."
      >
        <ServicesChart data={services} />
      </Section>

      <Section
        id="locations"
        eyebrow="Location comparison"
        title="Exult Healthcare vs MDPA"
        description="MDPA is Exult's satellite clinic in Sherman, TX. Dollar figures below are drawn from the tracked charges ledger (750 billed patients)."
      >
        <LocationCompare data={locations} />
      </Section>

      <Section
        id="revenue"
        eyebrow="Revenue waterfall"
        title="Gross billed → actually collected"
        description="~52% of gross charges are written off (adjustments, contractual discounts). Another 17% remain outstanding. Net collection rate sits around 31% — unusually low, worth a deeper review with the billing team."
      >
        <WaterfallChart data={revenueWaterfall} />
      </Section>

      <Section
        id="quality"
        eyebrow="Data quality"
        title="Known gaps in this snapshot"
        description="This section is surfaced so downstream consumers know the edges of each metric."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {dataQuality.notes.map((n) => (
            <div key={n.metric} className="card p-4">
              <div className="flex items-baseline justify-between">
                <div className="section-heading">{n.metric}</div>
                <div className="text-lg font-semibold text-slate-100">
                  {fmtInt(n.count)}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">{n.note}</p>
            </div>
          ))}
        </div>
      </Section>

      <footer className="border-t border-slate-800/80 py-8 text-[11px] text-slate-500">
        <div className="max-w-3xl space-y-2">
          <div className="section-heading">Methodology</div>
          {meta.notes.map((note, i) => (
            <p key={i}>{note}</p>
          ))}
          <p className="pt-2 text-slate-600">
            Snapshot generated at {new Date(meta.generated_at).toUTCString()}.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Hero({
  kpis,
  meta,
}: {
  kpis: typeof data.kpis;
  meta: typeof data.meta;
}) {
  return (
    <header className="mb-10">
      <div className="section-heading">{meta.office}</div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
        Historical Analytics Dashboard
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Aggregate snapshot covering patient cohorts, retention, LTV, provider
        performance, service mix and collections — reporting period{" "}
        <strong className="text-slate-200">
          {kpis.date_range.start} → {kpis.date_range.end}
        </strong>
        . No PHI displayed.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          label="Total patients"
          value={fmtInt(kpis.total_patients)}
          sub={`${fmtInt(kpis.patients_with_visits)} had ≥1 visit in window`}
        />
        <KpiTile
          label="Total visits"
          value={fmtInt(kpis.total_visits)}
          sub={`REST ${fmtInt(kpis.rich_visits)} · XML ${fmtInt(
            kpis.historical_visits
          )}`}
        />
        <KpiTile
          label="Gross billed"
          value={fmtCompactUsd(kpis.gross_billed)}
          sub="tx_summary lifetime"
          accent="#38bdf8"
        />
        <KpiTile
          label="Collected"
          value={fmtCompactUsd(kpis.total_collected)}
          sub={`Write-offs ${fmtCompactUsd(kpis.total_writeoffs)}`}
          accent="#34d399"
        />
        <KpiTile
          label="Net collection"
          value={fmtPct(kpis.net_collection_rate)}
          sub={`Outstanding ${fmtCompactUsd(kpis.outstanding_balance)}`}
          accent="#facc15"
        />
      </div>
    </header>
  );
}

function ShellCallout({ kpis }: { kpis: typeof data.kpis }) {
  const shellPct =
    kpis.zero_charge_patients / Math.max(1, kpis.tx_summary_patients);
  return (
    <div
      className="card p-6 md:p-8"
      style={{
        background:
          "linear-gradient(180deg, rgba(251,113,133,0.12), rgba(15,23,42,1))",
        borderColor: "rgba(251,113,133,0.4)",
      }}
    >
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr),auto]">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-300">
            Cleanup target
          </div>
          <h3 className="mt-1 text-2xl font-semibold text-slate-50">
            {fmtInt(kpis.zero_charge_patients)} shell accounts
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            {fmtPct(shellPct)} of the patients in AMD&apos;s transaction ledger
            have <strong>$0 lifetime charges</strong> — no visits ever got
            billed. Likely causes: intake abandonment, duplicate records, or
            the patient was created in AMD but never made it to a real visit.
            Good candidates for a merge/deactivate sweep.
          </p>
        </div>
        <div className="flex gap-6 md:border-l md:border-rose-900/30 md:pl-8">
          <div>
            <div className="text-[11px] text-rose-300/80">Total ledger</div>
            <div className="text-2xl font-semibold text-slate-50">
              {fmtInt(kpis.tx_summary_patients)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-emerald-300/80">
              Billed patients
            </div>
            <div className="text-2xl font-semibold text-slate-50">
              {fmtInt(kpis.billed_patients)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-rose-300">Shells</div>
            <div className="text-2xl font-semibold text-rose-300">
              {fmtInt(kpis.zero_charge_patients)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
