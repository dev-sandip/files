import { FileLibrary } from "@/components/files/FileLibrary";
import { isAdminUser } from "@/lib/auth-user";
import { parseFilesFolderSegment } from "@/lib/files-url";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function FilesFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");

  const { folderId: raw } = await params;
  const folderId = parseFilesFolderSegment(raw);
  if (!folderId) redirect("/");

  return (
    <FileLibrary
      userId={session.user.id}
      userName={session.user.name}
      userImage={session.user.image}
      isAdmin={isAdminUser(session.user)}
      folderId={folderId}
    />
  );
}
