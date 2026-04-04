/**
 * Reads the Better Auth session token cookie without importing `better-auth/cookies`
 * (that path bundles jose and triggers Edge warnings in middleware).
 * Matches defaults: prefix `better-auth`, name `session_token`, optional `__Secure-`.
 */
const SECURE_COOKIE_PREFIX = "__Secure-";

function parseCookieHeader(cookieHeader: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of cookieHeader.split("; ")) {
    const m = part.match(/^([^=]+)=(.*)$/s);
    if (!m) continue;
    map.set(m[1], m[2]);
  }
  return map;
}

export function readBetterAuthSessionToken(request: Request): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  const parsed = parseCookieHeader(raw);
  const get = (name: string) =>
    parsed.get(name) ?? parsed.get(`${SECURE_COOKIE_PREFIX}${name}`);
  const cookiePrefix = "better-auth";
  const cookieName = "session_token";
  return (
    get(`${cookiePrefix}.${cookieName}`) ??
    get(`${cookiePrefix}-${cookieName}`) ??
    null
  );
}
