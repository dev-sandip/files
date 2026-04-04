import "server-only";

import { db } from "@/db";
import { appSetting } from "@/db/schema/settings";
import {
  INVITE_PHRASE_TTL_MS,
  SIGNUP_PHRASE_EXPIRES_AT_KEY,
  SIGNUP_PHRASE_HASH_KEY,
  generateInviteSentence,
  hashInvitePhrase,
} from "@/lib/invite";
import { inArray } from "drizzle-orm";

export async function clearSignupInviteKeys() {
  await db.delete(appSetting).where(
    inArray(appSetting.key, [
      SIGNUP_PHRASE_HASH_KEY,
      SIGNUP_PHRASE_EXPIRES_AT_KEY,
    ]),
  );
}

export async function getSignupInviteFromDb() {
  const rows = await db
    .select()
    .from(appSetting)
    .where(
      inArray(appSetting.key, [
        SIGNUP_PHRASE_HASH_KEY,
        SIGNUP_PHRASE_EXPIRES_AT_KEY,
      ]),
    );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
    string,
    string | undefined
  >;
  const hash = map[SIGNUP_PHRASE_HASH_KEY];
  const expiresAtRaw = map[SIGNUP_PHRASE_EXPIRES_AT_KEY];
  if (hash && isInviteExpired(expiresAtRaw)) {
    await clearSignupInviteKeys();
    return { hash: undefined, expiresAtRaw: undefined };
  }
  return { hash, expiresAtRaw };
}

/** @returns true if invite row exists and is past expiry (or malformed). */
export function isInviteExpired(expiresAtRaw: string | undefined): boolean {
  if (!expiresAtRaw) return true;
  const t = Date.parse(expiresAtRaw);
  if (Number.isNaN(t)) return true;
  return t <= Date.now();
}

export async function rotateStoredInvitePhrase() {
  await getSignupInviteFromDb();
  const sentence = generateInviteSentence();
  const hash = hashInvitePhrase(sentence);
  const expiresAt = new Date(
    Date.now() + INVITE_PHRASE_TTL_MS,
  ).toISOString();

  await db.transaction(async (tx) => {
    await tx
      .insert(appSetting)
      .values({ key: SIGNUP_PHRASE_HASH_KEY, value: hash })
      .onConflictDoUpdate({
        target: appSetting.key,
        set: { value: hash },
      });
    await tx
      .insert(appSetting)
      .values({ key: SIGNUP_PHRASE_EXPIRES_AT_KEY, value: expiresAt })
      .onConflictDoUpdate({
        target: appSetting.key,
        set: { value: expiresAt },
      });
  });

  return { phrase: sentence, expiresAt };
}
