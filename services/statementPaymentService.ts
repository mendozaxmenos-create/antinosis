import { endOfMonth, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";

const IMPORT_SOURCES = ["imported_file", "imported_pdf"] as const;

function periodKey(cardId: string, importYear: number, importMonth: number) {
  return `${cardId}|${importYear}|${importMonth}`;
}

async function buildImportedPeriodTotals(userId: string): Promise<Map<string, number>> {
  const groupSums = await prisma.expense.groupBy({
    by: ["cardId", "postedMonth", "postedYear"],
    where: {
      card: { userId },
      sourceType: { in: [...IMPORT_SOURCES] },
    },
    _sum: { amount: true },
  });
  return new Map(
    groupSums.map((g) => [periodKey(g.cardId, g.postedYear, g.postedMonth), g._sum.amount ?? 0]),
  );
}

/**
 * Suma los importes de los resúmenes importados cuyo vencimiento de pago cae en el mes calendario dado.
 * Por cada resumen se toma el total de movimientos importados (mismo cardId + período del resumen).
 */
export async function sumStatementPaymentsDueInMonth(
  userId: string,
  month: number,
  year: number,
): Promise<number> {
  const ref = new Date(year, month - 1, 1);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);

  const [periodTotals, imports] = await Promise.all([
    buildImportedPeriodTotals(userId),
    prisma.statementImport.findMany({
      where: {
        userId,
        paymentDueDate: {
          not: null,
          gte: start,
          lte: end,
        },
      },
      select: { cardId: true, importMonth: true, importYear: true },
    }),
  ]);

  const seen = new Set<string>();
  let total = 0;

  for (const stmt of imports) {
    if (!stmt.cardId) continue;
    const key = periodKey(stmt.cardId, stmt.importYear, stmt.importMonth);
    if (seen.has(key)) continue;
    seen.add(key);
    total += periodTotals.get(key) ?? 0;
  }

  return total;
}

/**
 * Para cada mes calendario (clave `year-month`), total a pagar por resúmenes con vencimiento en ese mes.
 */
export async function mapStatementPaymentsDueByCalendarMonth(
  userId: string,
): Promise<Map<string, number>> {
  const [periodTotals, imports] = await Promise.all([
    buildImportedPeriodTotals(userId),
    prisma.statementImport.findMany({
      where: { userId, paymentDueDate: { not: null } },
      select: { cardId: true, importMonth: true, importYear: true, paymentDueDate: true },
    }),
  ]);

  const result = new Map<string, number>();
  const seenPerDue = new Map<string, Set<string>>();

  for (const imp of imports) {
    if (!imp.cardId || !imp.paymentDueDate) continue;
    const d = imp.paymentDueDate;
    const dueKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const pk = periodKey(imp.cardId, imp.importYear, imp.importMonth);
    let set = seenPerDue.get(dueKey);
    if (!set) {
      set = new Set();
      seenPerDue.set(dueKey, set);
    }
    if (set.has(pk)) continue;
    set.add(pk);
    const amt = periodTotals.get(pk) ?? 0;
    result.set(dueKey, (result.get(dueKey) ?? 0) + amt);
  }

  return result;
}
