import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  // 2-round FNV1a with a salt so we never round-trip the plain password.
  return fnv1a("exult-salt-" + fnv1a(password));
}

export function middleware(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  const { pathname } = req.nextUrl;

  // Always allow these paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/login" ||
    pathname === "/api/login"
  ) {
    return NextResponse.next();
  }

  // If no password is configured, allow access (dev fallback).
  if (!password) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && cookie === expectedToken(password)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|data/).*)"],
};
