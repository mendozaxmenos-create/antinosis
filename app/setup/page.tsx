import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "@/components/forms/setup-form";
import { requireAuthSession } from "@/lib/admin-auth";
import { isAppAuthEnabledFromEnv } from "@/lib/admin-auth-config";

export default async function SetupPage() {
  await requireAuthSession();
  if (isAppAuthEnabledFromEnv(process.env)) {
    redirect("/dashboard");
  }
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
