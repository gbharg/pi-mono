import { NextRequest, NextResponse } from "next/server";

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

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/api/login",
  "/api/ingest",         // secured via X-Ingest-Secret
  "/api/healthz",
  "/favicon.ico",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/assets")) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    return new NextResponse(
      "DASHBOARD_PASSWORD env var not set on the deployment",
      { status: 503 },
    );
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && cookie === expectedToken(expected)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
