import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

export default async function Home() {
  await requireAdminSession();
  const count = await prisma.user.count();
  if (count === 0) redirect("/setup");
  redirect("/dashboard");
}
