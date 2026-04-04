/** Browser-only helpers for Better Auth admin endpoints (cookies). */

export type AdminListUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | Date | null;
  createdAt: string | Date;
};

async function parseAuthResponse(res: Response) {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : typeof data === "string"
          ? data
          : res.statusText;
    throw new Error(msg);
  }
  return data;
}

export async function adminListUsers(): Promise<{
  users: AdminListUser[];
  total: number;
}> {
  const qs = new URLSearchParams({
    limit: "200",
    sortBy: "createdAt",
    sortDirection: "desc",
  });
  const res = await fetch(`/api/auth/admin/list-users?${qs}`, {
    credentials: "include",
  });
  return parseAuthResponse(res) as Promise<{
    users: AdminListUser[];
    total: number;
  }>;
}

export async function adminPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/auth${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseAuthResponse(res);
}
