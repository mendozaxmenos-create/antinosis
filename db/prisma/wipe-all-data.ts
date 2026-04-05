/**
 * Borra todos los datos de usuario (gastos, tarjetas, presupuestos, etc.) y deja solo las categorías.
 * Ejecutá una vez para quitar datos de demo: npm run db:wipe
 * Requiere DATABASE_URL (local o producción).
 */
import { PrismaClient } from "@prisma/client";
import { ensureCategories } from "../../lib/seed-categories";

const prisma = new PrismaClient();

async function main() {
  await prisma.alertEvent.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.alertThreshold.deleteMany();
  await prisma.monthlyBudgetConfig.deleteMany();
  await prisma.salaryBonus.deleteMany();
  await prisma.statementImport.deleteMany();
  await prisma.reconciliationResult.deleteMany();
  await prisma.creditCard.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  await ensureCategories(prisma);
  console.log("Listo — base vacía (solo categorías). Creá tu usuario en /setup.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
