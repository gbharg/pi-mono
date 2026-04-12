"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        router.replace(next);
      } else {
        const j = await r.json().catch(() => ({}));
        setError(j.error || "Invalid password");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm border border-neutral-800 rounded-lg p-6 bg-neutral-900"
    >
      <h1 className="text-xl font-semibold mb-1">Exult Daily Ops</h1>
      <p className="text-sm text-neutral-400 mb-4">
        Enter the dashboard password.
      </p>
      <input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-neutral-100 focus:outline-none focus:border-emerald-600"
        placeholder="password"
      />
      {error && (
        <div className="text-red-400 text-sm mt-2" role="alert">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !password}
        className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-400 text-white font-medium rounded px-3 py-2 transition"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 px-4">
      <Suspense
        fallback={
          <div className="text-neutral-400 text-sm">Loading…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
