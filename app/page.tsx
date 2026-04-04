import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession();
  redirect(session?.user ? "/files" : "/login");
}
