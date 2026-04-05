import { PrismaClient } from "@prisma/client";
import { ensureCategories } from "../../lib/seed-categories";

const prisma = new PrismaClient();

async function main() {
  await ensureCategories(prisma);
  console.log("Seed OK — categorías listas (sin datos de prueba).");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
