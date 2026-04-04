import { readBetterAuthSessionToken } from "@/lib/better-auth-session-cookie";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Let Better Auth handle sign-in, sign-up, session, admin plugin, etc. */
const AUTH_API_PREFIX = "/api/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  if (pathname.startsWith(AUTH_API_PREFIX)) {
    return NextResponse.next();
  }

  const sessionToken = readBetterAuthSessionToken(request);
  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
