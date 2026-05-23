export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string; error?: string };
}) {
  const from = searchParams.from ?? "/";
  const error = searchParams.error === "1";
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6">
          <div className="section-heading mb-2">Exult Healthcare</div>
          <h1 className="text-xl font-semibold">Historical Analytics</h1>
          <p className="mt-2 text-sm text-slate-400">
            This dashboard contains aggregate operational data. Enter the
            access password to continue.
          </p>
        </div>
        <form method="POST" action="/api/login" className="space-y-3">
          <input type="hidden" name="from" value={from} />
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoFocus
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
          />
          {error && (
            <div className="text-xs text-rose-400">
              Incorrect password — try again.
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Sign in
          </button>
        </form>
        <p className="mt-6 text-[11px] leading-5 text-slate-500">
          No PHI is displayed on this dashboard. Aggregate counts only.
        </p>
      </div>
    </div>
  );
}
