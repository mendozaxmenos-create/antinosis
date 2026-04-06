import { prisma } from "@/lib/prisma";
import { STATEMENT_IMPORT_EXPENSE_SOURCE_TYPES } from "@/lib/statement-import-expense-sources";
import type {
  IncomeVsImportedPoint,
  RecentBonusBarPoint,
  StatementUploadMonthPoint,
} from "@/lib/analytics-chart-types";
import { getIncomeEvolutionSeries } from "@/services/salaryBonusService";

const IMPORT_SOURCES = [...STATEMENT_IMPORT_EXPENSE_SOURCE_TYPES];

/**
 * Últimos N bonos cargados (orden cronológico para el eje X).
 */
export async function getRecentBonusesChartData(
  userId: string,
  take: number = 14,
): Promise<RecentBonusBarPoint[]> {
  const rows = await prisma.salaryBonus.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  const chronological = [...rows].reverse();
  return chronological.map((b) => {
    const period = `${String(b.month).padStart(2, "0")}/${b.year}`;
    const note = b.label?.trim();
    return {
      id: b.id,
      label: period,
      amount: b.amount,
      detail: note ? `${period} — ${note}` : period,
    };
  });
}

/**
 * Resúmenes importados por mes calendario de **subida** (createdAt).
 */
export async function getStatementUploadsByMonth(
  userId: string,
  maxMonthsBack: number = 24,
): Promise<StatementUploadMonthPoint[]> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - maxMonthsBack);

  const imports = await prisma.statementImport.findMany({
    where: {
      userId,
      createdAt: { gte: cutoff },
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  if (imports.length === 0) return [];

  const ids = imports.map((i) => i.id);
  const sums = await prisma.expense.groupBy({
    by: ["statementImportId"],
    where: {
      statementImportId: { in: ids },
      card: { userId },
      sourceType: { in: IMPORT_SOURCES },
    },
    _sum: { amount: true },
  });
  const totalByImport = new Map(sums.map((s) => [s.statementImportId!, s._sum.amount ?? 0]));

  type Agg = { count: number; totalArs: number };
  const byKey = new Map<string, Agg>();
  for (const imp of imports) {
    const d = imp.createdAt;
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const agg = byKey.get(key) ?? { count: 0, totalArs: 0 };
    agg.count += 1;
    agg.totalArs += totalByImport.get(imp.id) ?? 0;
    byKey.set(key, agg);
  }

  const sortedKeys = Array.from(byKey.keys()).sort((a, b) => {
    const [ya, ma] = a.split("-").map(Number);
    const [yb, mb] = b.split("-").map(Number);
    return ya !== yb ? ya - yb : ma - mb;
  });

  return sortedKeys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const row = byKey.get(key)!;
    return {
      key,
      label: `${String(m).padStart(2, "0")}/${y}`,
      uploadCount: row.count,
      totalImportedArs: row.totalArs,
    };
  });
}

/**
 * Por mes calendario (operación): ingreso total (neto + bonos del mes) vs suma de movimientos importados desde resúmenes.
 */
export async function getIncomeVsImportedCardSeries(
  userId: string,
): Promise<IncomeVsImportedPoint[]> {
  const [evolution, importedAgg] = await Promise.all([
    getIncomeEvolutionSeries(userId),
    prisma.expense.groupBy({
      by: ["postedYear", "postedMonth"],
      where: {
        card: { userId },
        sourceType: { in: IMPORT_SOURCES },
      },
      _sum: { amount: true },
    }),
  ]);

  const importedMap = new Map(
    importedAgg.map((r) => [`${r.postedYear}-${r.postedMonth}`, r._sum.amount ?? 0]),
  );

  const keys = new Set<string>();
  evolution.forEach((e) => keys.add(e.key));
  importedAgg.forEach((r) => keys.add(`${r.postedYear}-${r.postedMonth}`));

  const sorted = Array.from(keys).sort((a, b) => {
    const [ya, ma] = a.split("-").map(Number);
    const [yb, mb] = b.split("-").map(Number);
    return ya !== yb ? ya - yb : ma - mb;
  });

  return sorted.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const ev = evolution.find((x) => x.key === key);
    const net = ev?.netIncome ?? 0;
    const bonus = ev?.bonus ?? 0;
    return {
      key,
      label: `${String(m).padStart(2, "0")}/${y}`,
      totalIncome: net + bonus,
      importedCardSpending: importedMap.get(key) ?? 0,
    };
  });
}
