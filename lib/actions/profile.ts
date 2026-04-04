"use server";

import { normalizeActionError } from "@/lib/action-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function updateProfileNameAction(name: string) {
  try {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name is required");
    await auth.api.updateUser({
      headers: await headers(),
      body: { name: trimmed },
    });
    return { ok: true as const };
  } catch (e) {
    throw normalizeActionError(e);
  }
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}) {
  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: input.revokeOtherSessions ?? false,
      },
    });
    return { ok: true as const };
  } catch (e) {
    throw normalizeActionError(e);
  }
}

export async function setProfileImageKeyAction(imageKey: string) {
  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: { image: imageKey },
    });
    return { ok: true as const };
  } catch (e) {
    throw normalizeActionError(e);
  }
}
