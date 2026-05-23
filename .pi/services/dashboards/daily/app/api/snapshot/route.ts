// GET /api/snapshot — returns the latest snapshot.
// Password middleware already enforces auth; this route is read-only.

import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/storage";
import { emptySnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayStr(tz = "America/Chicago"): string {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // en-CA → "YYYY-MM-DD"
}

function yesterdayStr(tz = "America/Chicago"): string {
  const d = new Date(Date.now() - 24 * 3600 * 1000);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

export async function GET() {
  const snap = await getSnapshot();
  if (snap) {
    return NextResponse.json({
      ok: true,
      stale: false,
      snapshot: snap,
    });
  }
  // No data yet — return an empty shell the UI can render.
  const empty = emptySnapshot(todayStr(), yesterdayStr());
  return NextResponse.json({
    ok: true,
    stale: true,
    empty: true,
    snapshot: empty,
  });
}
