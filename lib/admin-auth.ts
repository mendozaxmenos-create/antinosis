import { redirect } from "next/navigation";

import { isAdminAuthEnabledFromEnv, isAdminEmailFromEnv } from "@/lib/admin-auth-config";

export const isAdminAuthEnabled = () => isAdminAuthEnabledFromEnv(process.env);
export const isAdminEmail = (email: string | null | undefined) => isAdminEmailFromEnv(email, process.env);

/**
 * En modo admin-auth, exige sesión y que el email esté permitido.
 * Si admin-auth no está configurado, no hace nada (mantiene el modo single-tenant abierto).
 */
export async function requireAdminSession() {
  if (!isAdminAuthEnabled()) return null;
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!isAdminEmail(email)) {
    redirect("/login");
  }
  return session;
}

