/** Better Auth session user may include plugin fields (e.g. `role`) not in default TS shape. */
export function isAdminUser(
  user: { role?: string | null } | undefined,
): boolean {
  return user?.role === "admin";
}
