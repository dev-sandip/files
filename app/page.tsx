import { FileLibrary } from "@/components/files/FileLibrary";
import { LandingPage } from "@/components/landing-page";
import { isAdminUser } from "@/lib/auth-user";
import { getServerSession } from "@/lib/session";

export default async function Home() {
  const session = await getServerSession();
  if (session?.user) {
    return (
      <FileLibrary isAdmin={isAdminUser(session.user)} folderId={null} />
    );
  }
  return <LandingPage />;
}
