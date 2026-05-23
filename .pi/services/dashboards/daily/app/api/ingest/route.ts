// POST /api/ingest — receives a Snapshot JSON from the local refresher.
// Auth: X-Ingest-Secret header must equal process.env.INGEST_SECRET.

import { NextRequest, NextResponse } from "next/server";
import { setSnapshot } from "@/lib/storage";
import type { Snapshot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.INGEST_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "INGEST_SECRET not set" },
      { status: 503 },
    );
  }
  const provided = req.headers.get("x-ingest-secret");
  if (provided !== expected) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "body must be an object" },
      { status: 400 },
    );
  }
  const snap = body as Snapshot;
  if (snap.schema_version !== 1) {
    return NextResponse.json(
      { ok: false, error: `unsupported schema_version ${snap.schema_version}` },
      { status: 400 },
    );
  }
  if (!snap.generated_at || !snap.today_date) {
    return NextResponse.json(
      { ok: false, error: "missing required fields" },
      { status: 400 },
    );
  }

  const { blob } = await setSnapshot(snap);
  return NextResponse.json({
    ok: true,
    persisted_to_blob: blob,
    generated_at: snap.generated_at,
  });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "POST a Snapshot JSON with X-Ingest-Secret header" },
    { status: 405 },
  );
}
