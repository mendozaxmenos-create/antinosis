import type { PrismaClient } from "@prisma/client";

export const CATEGORY_NAMES = [
  "Supermarket",
  "Fuel",
  "Health",
  "Pharmacy",
  "Delivery",
  "Streaming",
  "Education",
  "Clothing",
  "Services",
  "Travel",
  "Taxes",
  "Entertainment",
  "Home",
  "Other",
] as const;

export async function ensureCategories(prisma: PrismaClient) {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      create: { name, active: true },
      update: { active: true },
    });
  }
}
