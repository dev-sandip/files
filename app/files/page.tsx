import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function FilesPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");
  redirect("/");
}
