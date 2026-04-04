import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

export function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}
