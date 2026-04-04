import type { Expense } from "@prisma/client";

export function calculateMonthlyLimit(input: {
  monthlyIncome: number | null | undefined;
  allowedPercentage: number | null | undefined;
  manualCardLimit: number | null | undefined;
}): number {
  if (input.manualCardLimit != null && input.manualCardLimit > 0) {
    return input.manualCardLimit;
  }
  const income = input.monthlyIncome ?? 0;
  const pct = (input.allowedPercentage ?? 0) / 100;
  return Math.max(0, income * pct);
}

export function calculateTotalSpent(expenses: Pick<Expense, "amount">[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function calculateRemaining(budget: number, spent: number): number {
  return budget - spent;
}

/** Percentage of budget used; can exceed 100 when over budget. */
export function calculatePercentage(spent: number, budget: number): number {
  if (budget <= 0) return spent > 0 ? 100 : 0;
  return (spent / budget) * 100;
}

export const DEFAULT_THRESHOLDS = [60, 70, 80, 90, 100] as const;

export function checkThresholds(
  percentageUsed: number,
  thresholds: { percentage: number; enabled: boolean }[],
): number[] {
  const crossed: number[] = [];
  for (const t of thresholds) {
    if (!t.enabled) continue;
    if (percentageUsed >= t.percentage) crossed.push(t.percentage);
  }
  return crossed;
}

export function groupByCategory(
  rows: { categoryName: string; amount: number }[],
): { categoryName: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.categoryName, (map.get(r.categoryName) ?? 0) + r.amount);
  }
  return Array.from(map.entries())
    .map(([categoryName, amount]) => ({ categoryName, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export type MonthSummary = {
  month: number;
  year: number;
  budget: number;
  /** Gasto que cuenta para el límite (en curso / manual) */
  spent: number;
  /** Total desde resúmenes importados; no compara contra el límite */
  importedSpent: number;
  difference: number;
  percentUsed: number;
  exceeded: boolean;
};

export function compareMonths(summaries: MonthSummary[]): MonthSummary[] {
  return [...summaries].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );
}

export type GaugeBand = "healthy" | "warning" | "danger" | "exceeded";

export function gaugeBandFromPercent(p: number): GaugeBand {
  if (p >= 100) return "exceeded";
  if (p >= 80) return "danger";
  if (p >= 60) return "warning";
  return "healthy";
}

export function gaugeIndicatorClass(band: GaugeBand): string {
  switch (band) {
    case "healthy":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-400";
    case "danger":
      return "bg-orange-500";
    case "exceeded":
      return "bg-red-600";
    default:
      return "bg-primary";
  }
}
