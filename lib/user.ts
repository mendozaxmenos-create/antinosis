import { prisma } from "@/lib/prisma";

export async function getDefaultUserId(): Promise<string | null> {
  const u = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  return u?.id ?? null;
}
