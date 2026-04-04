import { ProfileForm } from "@/components/profile-form";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");

  return <ProfileForm />;
}
