import { redirect } from "next/navigation";

import { isAppAuthEnabledFromEnv, isAdminEmailFromEnv } from "@/lib/admin-auth-config";

export const isAppAuthEnabled = () => isAppAuthEnabledFromEnv(process.env);

/** Emails listados en ADMIN_EMAILS reciben rol `admin` al crear la cuenta. */
export const isAdminEmail = (email: string | null | undefined) =>
  isAdminEmailFromEnv(email, process.env);

/**
 * Si el login por app está configurado, exige sesión válida; si no, modo legacy (sin gate OAuth).
 */
export async function requireAuthSession() {
  if (!isAppAuthEnabled()) return null;
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

/** Alias histórico — mismo comportamiento que `requireAuthSession`. */
export async function requireAdminSession() {
  return requireAuthSession();
}
