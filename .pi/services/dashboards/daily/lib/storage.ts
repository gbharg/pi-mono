// Snapshot storage for the daily dashboard.
//
// Primary store: Vercel Blob (persistent across cold starts).
// Fallback: global in-memory variable (warm-lambda only — acceptable because
// the refresher pushes a fresh snapshot every 5 minutes anyway).

import type { Snapshot } from "./types";

const BLOB_KEY = "snapshot/latest.json";

// Module-level warm cache so repeated GETs in the same lambda don't hit blob.
let memCache: { data: Snapshot | null; at: number } = { data: null, at: 0 };
const MEM_TTL_MS = 30_000;

async function readBlob(): Promise<Snapshot | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const { list } = await import("@vercel/blob");
    const res = await list({ prefix: BLOB_KEY, limit: 1, token });
    const hit = res.blobs.find((b) => b.pathname === BLOB_KEY);
    if (!hit) return null;
    const r = await fetch(hit.url, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as Snapshot;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[storage] blob read failed:", (e as Error).message);
    return null;
  }
}

async function writeBlob(snap: Snapshot): Promise<boolean> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  try {
    const { put } = await import("@vercel/blob");
    await put(BLOB_KEY, JSON.stringify(snap), {
      access: "public",        // Read URLs are still obscure; dashboard gates access separately.
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 10,
      token,
    });
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[storage] blob write failed:", (e as Error).message);
    return false;
  }
}

export async function getSnapshot(): Promise<Snapshot | null> {
  const now = Date.now();
  if (memCache.data && now - memCache.at < MEM_TTL_MS) {
    return memCache.data;
  }
  const fromBlob = await readBlob();
  if (fromBlob) {
    memCache = { data: fromBlob, at: now };
    return fromBlob;
  }
  // Fall back to a stale in-memory copy if blob unavailable.
  return memCache.data;
}

export async function setSnapshot(snap: Snapshot): Promise<{ blob: boolean }> {
  memCache = { data: snap, at: Date.now() };
  const blob = await writeBlob(snap);
  return { blob };
}
