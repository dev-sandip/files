"use server";

import { normalizeActionError } from "@/lib/action-utils";
import type { AdminListUser } from "@/lib/admin-types";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function listAdminUsersAction(): Promise<{
  users: AdminListUser[];
  total: number;
}> {
  try {
    const data = await auth.api.listUsers({
      headers: await headers(),
      query: {
        limit: 200,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    });
    if (!data) throw new Error("Could not load users");
    return {
      users: data.users as AdminListUser[],
      total: data.total,
    };
  } catch (e) {
    throw normalizeActionError(e);
  }
}

export async function setUserRoleAction(input: {
  userId: string;
  role: "admin" | "user";
}) {
  try {
    await auth.api.setRole({
      headers: await headers(),
      body: { userId: input.userId, role: input.role },
    });
    return { ok: true as const };
  } catch (e) {
    throw normalizeActionError(e);
  }
}

export async function banUserAction(input: {
  userId: string;
  banReason?: string;
}) {
  try {
    await auth.api.banUser({
      headers: await headers(),
      body: {
        userId: input.userId,
        banReason: input.banReason,
      },
    });
    return { ok: true as const };
  } catch (e) {
    throw normalizeActionError(e);
  }
}

export async function unbanUserAction(input: { userId: string }) {
  try {
    await auth.api.unbanUser({
      headers: await headers(),
      body: { userId: input.userId },
    });
    return { ok: true as const };
  } catch (e) {
    throw normalizeActionError(e);
  }
}
