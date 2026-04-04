import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

const ADJECTIVES = [
  "quiet",
  "brave",
  "swift",
  "gentle",
  "curious",
  "silent",
  "calm",
  "bright",
  "steady",
  "patient",
];

const NOUNS = [
  "river",
  "meadow",
  "atlas",
  "harbor",
  "cipher",
  "ledger",
  "archive",
  "compass",
  "signal",
  "mirror",
];

export function normalizeInvitePhrase(p: string) {
  return p.trim().replace(/\s+/g, " ").toLowerCase();
}

function pepper() {
  return process.env.BETTER_AUTH_SECRET ?? "";
}

export function hashInvitePhrase(phrase: string) {
  return createHash("sha256").update(pepper()).update(normalizeInvitePhrase(phrase)).digest("hex");
}

export function verifyInvitePhrase(input: string, storedHash: string) {
  const computed = hashInvitePhrase(input);
  try {
    return timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(storedHash, "utf8"));
  } catch {
    return false;
  }
}

export function timingSafeStringEqual(a: string, b: string) {
  const na = normalizeInvitePhrase(a);
  const nb = normalizeInvitePhrase(b);
  if (na.length !== nb.length) return false;
  try {
    return timingSafeEqual(Buffer.from(na, "utf8"), Buffer.from(nb, "utf8"));
  } catch {
    return false;
  }
}

export function generateInviteSentence() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]!;
  const n1 = NOUNS[Math.floor(Math.random() * NOUNS.length)]!;
  const n2 = NOUNS[Math.floor(Math.random() * NOUNS.length)]!;
  const n = 1000 + Math.floor(Math.random() * 9000);
  return `${adj}-${n1}-${n2}-${n}`;
}

export const SIGNUP_PHRASE_HASH_KEY = "signup_phrase_hash";
/** ISO 8601 timestamp; invite invalid at or after this instant. */
export const SIGNUP_PHRASE_EXPIRES_AT_KEY = "signup_phrase_expires_at";

/** Generated invite phrases expire after this duration. */
export const INVITE_PHRASE_TTL_MS = 5 * 60 * 1000;
