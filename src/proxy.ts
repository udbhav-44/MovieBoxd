import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, authConfig, isValidSessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { enabled, secret } = authConfig();
  if (!enabled) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/login" || pathname === "/api/auth") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSessionToken(secret, token)) {
    return NextResponse.next();
  }

  // API callers get a status they can act on rather than a login page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except Next's own assets, which must stay reachable so the
  // login page can actually render.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
