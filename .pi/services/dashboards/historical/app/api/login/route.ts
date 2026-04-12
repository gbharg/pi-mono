import { NextResponse } from "next/server";

const COOKIE_NAME = "exult_dash_auth";

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function expectedToken(password: string): string {
  return fnv1a("exult-salt-" + fnv1a(password));
}

export async function POST(req: Request) {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    return NextResponse.json({ ok: true });
  }
  const form = await req.formData();
  const submitted = String(form.get("password") ?? "");
  const from = String(form.get("from") ?? "/");
  if (submitted !== expected) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "1");
    if (from) url.searchParams.set("from", from);
    return NextResponse.redirect(url, { status: 303 });
  }
  const url = new URL(from.startsWith("/") ? from : "/", req.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set({
    name: COOKIE_NAME,
    value: expectedToken(submitted),
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
