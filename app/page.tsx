import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuthSession } from "@/lib/admin-auth";
import { isAppAuthEnabledFromEnv } from "@/lib/admin-auth-config";

export default async function Home() {
  await requireAuthSession();
  if (!isAppAuthEnabledFromEnv(process.env)) {
    const count = await prisma.user.count();
    if (count === 0) redirect("/setup");
  }
  redirect("/dashboard");
}
