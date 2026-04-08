import { prisma } from "@/lib/prisma";
import { isAppAuthEnabledFromEnv } from "@/lib/admin-auth-config";

/** Solo modo legacy sin login por app: primer/único usuario en la base. */
export async function getDefaultUserId(): Promise<string | null> {
  const u = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  return u?.id ?? null;
}

/** Usuario actual: sesión NextAuth si hay login por app; si no, primer usuario (legacy). */
export async function getCurrentUserId(): Promise<string | null> {
  if (isAppAuthEnabledFromEnv(process.env)) {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    return session?.user?.id ?? null;
  }
  return getDefaultUserId();
}
