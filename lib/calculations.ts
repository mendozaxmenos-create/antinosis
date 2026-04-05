import type { Expense } from "@prisma/client";

export type BudgetComputationInput = {
  monthlyIncome: number | null | undefined;
  allowedPercentage: number | null | undefined;
  manualCardLimit: number | null | undefined;
  soledadCashTransfer?: number | null | undefined;
  savingsPercentage?: number | null | undefined;
  /** Total a pagar por resúmenes con vencimiento en el mes calendario (importados). */
  cardPaymentsDueInMonth?: number | null | undefined;
};

/**
 * Desglose: neto → −Soledad → −pagos tarjeta (vencen este mes) → % ahorro sobre esa base → límite en curso (salvo tope manual).
 */
export function explainBudgetComputation(input: BudgetComputationInput) {
  const net = Math.max(0, input.monthlyIncome ?? 0);
  const soledad = Math.max(0, input.soledadCashTransfer ?? 0);
  const cardPay = Math.max(0, input.cardPaymentsDueInMonth ?? 0);
  const afterSoledad = Math.max(0, net - soledad);
  const baseForSavings = Math.max(0, net - soledad - cardPay);
  const savingsPctRaw =
    input.savingsPercentage != null && input.savingsPercentage !== undefined
      ? input.savingsPercentage
      : input.allowedPercentage != null
        ? 100 - input.allowedPercentage
        : 0;
  const savingsPct = Math.min(100, Math.max(0, savingsPctRaw));
  const savingsAmount = baseForSavings * (savingsPct / 100);
  const limitFromRule = Math.max(0, baseForSavings - savingsAmount);
  const manual = input.manualCardLimit;
  const finalLimit =
    manual != null && manual > 0 ? manual : Math.max(0, limitFromRule);
  return {
    netSalary: net,
    soledadCash: soledad,
    cardPaymentsDue: cardPay,
    /** net − Soledad (antes de restar vencimientos de tarjeta) */
    baseAfterSoledad: afterSoledad,
    /** net − Soledad − pagos con vencimiento este mes; aquí aplica el % de ahorro */
    baseForSavings,
    savingsPct,
    savingsAmount,
    limitFromRule,
    manualOverride: manual != null && manual > 0 ? manual : null,
    finalLimit,
  };
}

export function calculateMonthlyLimit(input: BudgetComputationInput): number {
  return explainBudgetComputation(input).finalLimit;
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
