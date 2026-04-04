"use server";

import { normalizeActionError } from "@/lib/action-utils";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-user";
import { INVITE_PHRASE_TTL_MS } from "@/lib/invite";
import { rotateStoredInvitePhrase } from "@/lib/invite-db";
import { headers } from "next/headers";

export async function generateInvitePhraseAction(): Promise<{
  phrase: string;
  expiresAt: string;
  validForMs: number;
  message: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !isAdminUser(session.user)) {
      throw new Error("Forbidden");
    }

    const { phrase, expiresAt } = await rotateStoredInvitePhrase();
    return {
      phrase,
      expiresAt,
      validForMs: INVITE_PHRASE_TTL_MS,
      message:
        `Copy this sentence now. It is not shown again. Expires in ${INVITE_PHRASE_TTL_MS / 60000} minutes.`,
    };
  } catch (e) {
    throw normalizeActionError(e);
  }
}
