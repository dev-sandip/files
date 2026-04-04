import { AdminAnalyticsPanel } from "@/components/admin-analytics-panel";
import { isAdminUser } from "@/lib/auth-user";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminAnalyticsPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");
  if (!isAdminUser(session.user)) redirect("/files");

  return <AdminAnalyticsPanel />;
}
