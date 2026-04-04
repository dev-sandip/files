import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-user";
import { INVITE_PHRASE_TTL_MS } from "@/lib/invite";
import { rotateStoredInvitePhrase } from "@/lib/invite-db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !isAdminUser(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { phrase, expiresAt } = await rotateStoredInvitePhrase();
  return NextResponse.json({
    phrase,
    expiresAt,
    validForMs: INVITE_PHRASE_TTL_MS,
    message:
      `Copy this sentence now. It is not shown again. Expires in ${INVITE_PHRASE_TTL_MS / 60000} minutes.`,
  });
}
