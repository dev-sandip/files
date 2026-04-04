import { LandingPage } from "@/components/landing-page";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession();
  if (session?.user) redirect("/files");
  return <LandingPage />;
}
