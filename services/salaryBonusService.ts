import type { IncomeEvolutionPoint } from "@/lib/income-evolution-types";
import { prisma } from "@/lib/prisma";

export async function listSalaryBonuses(userId: string) {
  return prisma.salaryBonus.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
  });
}

export async function sumSalaryBonuses(userId: string): Promise<number> {
  const r = await prisma.salaryBonus.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return r._sum.amount ?? 0;
}

/**
 * Serie para la gráfica de evolución: meses con sueldo neto > 0 o con bonos registrados.
 */
export async function getIncomeEvolutionSeries(
  userId: string
): Promise<IncomeEvolutionPoint[]> {
  const [history, bonuses] = await Promise.all([
    prisma.monthlyBudgetConfig.findMany({
      where: { userId },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.salaryBonus.findMany({ where: { userId } }),
  ]);

  const bonusByKey = new Map<string, number>();
  for (const b of bonuses) {
    const k = `${b.year}-${b.month}`;
    bonusByKey.set(k, (bonusByKey.get(k) ?? 0) + b.amount);
  }

  const monthKeys = new Set<string>();
  for (const h of history) {
    if (h.monthlyIncome != null && h.monthlyIncome > 0) {
      monthKeys.add(`${h.year}-${h.month}`);
    }
  }
  for (const b of bonuses) {
    monthKeys.add(`${b.year}-${b.month}`);
  }

  const sorted = Array.from(monthKeys).sort((a, b) => {
    const [ya, ma] = a.split("-").map(Number);
    const [yb, mb] = b.split("-").map(Number);
    return ya !== yb ? ya - yb : ma - mb;
  });

  return sorted.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const config = history.find((h) => h.year === y && h.month === m);
    const net = config?.monthlyIncome ?? 0;
    const bonus = bonusByKey.get(key) ?? 0;
    return {
      key,
      label: `${String(m).padStart(2, "0")}/${y}`,
      netIncome: net,
      bonus,
      total: net + bonus,
    };
  });
}
