import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "@/components/forms/setup-form";
import { requireAdminSession } from "@/lib/admin-auth";

export default async function SetupPage() {
  await requireAdminSession();
  const count = await prisma.user.count();
  if (count > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <SetupForm />
    </div>
  );
}
