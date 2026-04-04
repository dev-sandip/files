import { FileLibrary } from "@/components/files/FileLibrary";
import { isAdminUser } from "@/lib/auth-user";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function FilesPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");

  return (
    <FileLibrary
      userId={session.user.id}
      userName={session.user.name}
      userImage={session.user.image}
      isAdmin={isAdminUser(session.user)}
    />
  );
}
