import { AdminUsersPanel } from "@/components/admin-users-panel";
import { isAdminUser } from "@/lib/auth-user";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");
  if (!isAdminUser(session.user)) redirect("/files");

  return <AdminUsersPanel currentUserId={session.user.id} />;
}
