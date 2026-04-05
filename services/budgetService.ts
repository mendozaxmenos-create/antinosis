import { prisma } from "@/lib/prisma";
import {
  calculateMonthlyLimit,
  calculatePercentage,
  calculateRemaining,
  calculateTotalSpent,
} from "@/lib/calculations";
import { filterExpensesForBudgetLimit, isExpenseAgainstBudget } from "@/lib/expense-scope";
import { sumStatementPaymentsDueInMonth } from "@/services/statementPaymentService";

export async function getOrCreateBudgetConfig(userId: string, month: number, year: number) {
  const existing = await prisma.monthlyBudgetConfig.findUnique({
    where: { userId_month_year: { userId, month, year } },
    include: { alertThresholds: true },
  });
  if (existing) return existing;

  const defaults = [60, 70, 80, 90, 100].map((percentage) => ({
    percentage,
    enabled: true,
  }));

  const monthlyIncome = 0;
  const allowedPercentage = null;
  const soledadCashTransfer = 0;
  const savingsPercentage = null;
  const cardPaymentsDueInMonth = await sumStatementPaymentsDueInMonth(userId, month, year);
  const computedCardLimit = calculateMonthlyLimit({
    monthlyIncome,
    allowedPercentage,
    manualCardLimit: null,
    soledadCashTransfer,
    savingsPercentage,
    cardPaymentsDueInMonth,
  });

  return prisma.monthlyBudgetConfig.create({
    data: {
      userId,
      month,
      year,
      monthlyIncome,
      allowedPercentage,
      soledadCashTransfer,
      savingsPercentage,
      manualCardLimit: null,
      computedCardLimit,
      alertThresholds: { create: defaults },
    },
    include: { alertThresholds: true },
  });
}

export async function upsertBudgetConfig(
  userId: string,
  month: number,
  year: number,
  data: {
    monthlyIncome: number | null;
    allowedPercentage: number | null;
    manualCardLimit: number | null;
    soledadCashTransfer?: number | null;
    savingsPercentage?: number | null;
    thresholds?: { percentage: number; enabled: boolean }[];
  },
) {
  const cardPaymentsDueInMonth = await sumStatementPaymentsDueInMonth(userId, month, year);
  const computedCardLimit = calculateMonthlyLimit({
    monthlyIncome: data.monthlyIncome,
    allowedPercentage: data.allowedPercentage,
    manualCardLimit: data.manualCardLimit,
    soledadCashTransfer: data.soledadCashTransfer,
    savingsPercentage: data.savingsPercentage,
    cardPaymentsDueInMonth,
  });

  const existing = await prisma.monthlyBudgetConfig.findUnique({
    where: { userId_month_year: { userId, month, year } },
  });

  if (existing) {
    await prisma.monthlyBudgetConfig.update({
      where: { id: existing.id },
      data: {
        monthlyIncome: data.monthlyIncome,
        allowedPercentage: data.allowedPercentage,
        soledadCashTransfer: data.soledadCashTransfer ?? 0,
        savingsPercentage: data.savingsPercentage,
        manualCardLimit: data.manualCardLimit,
        computedCardLimit,
      },
    });
    if (data.thresholds?.length) {
      for (const t of data.thresholds) {
        await prisma.alertThreshold.upsert({
          where: {
            monthlyBudgetConfigId_percentage: {
              monthlyBudgetConfigId: existing.id,
              percentage: t.percentage,
            },
          },
          create: {
            monthlyBudgetConfigId: existing.id,
            percentage: t.percentage,
            enabled: t.enabled,
          },
          update: { enabled: t.enabled },
        });
      }
    }
    return prisma.monthlyBudgetConfig.findUniqueOrThrow({
      where: { id: existing.id },
      include: { alertThresholds: true },
    });
  }

  const thresholds =
    (data.thresholds?.length ?? 0) > 0
      ? data.thresholds!
      : [60, 70, 80, 90, 100].map((percentage) => ({ percentage, enabled: true }));

  return prisma.monthlyBudgetConfig.create({
    data: {
      userId,
      month,
      year,
      monthlyIncome: data.monthlyIncome,
      allowedPercentage: data.allowedPercentage,
      soledadCashTransfer: data.soledadCashTransfer ?? 0,
      savingsPercentage: data.savingsPercentage,
      manualCardLimit: data.manualCardLimit,
      computedCardLimit,
      alertThresholds: {
        create: thresholds.map((t) => ({
          percentage: t.percentage,
          enabled: t.enabled,
        })),
      },
    },
    include: { alertThresholds: true },
  });
}

/** Histórico de configuraciones por mes (ingresos y límites). */
export async function listBudgetHistory(userId: string, take = 120) {
  return prisma.monthlyBudgetConfig.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take,
    include: { alertThresholds: true },
  });
}

export async function sumRegisteredNetIncome(userId: string) {
  const agg = await prisma.monthlyBudgetConfig.aggregate({
    where: { userId, monthlyIncome: { gt: 0 } },
    _sum: { monthlyIncome: true },
  });
  return agg._sum.monthlyIncome ?? 0;
}

export async function countMonthsWithNetIncome(userId: string) {
  return prisma.monthlyBudgetConfig.count({
    where: { userId, monthlyIncome: { gt: 0 } },
  });
}

export async function getMonthFinancials(userId: string, month: number, year: number) {
  const config = await getOrCreateBudgetConfig(userId, month, year);
  const cardPaymentsDueInMonth = await sumStatementPaymentsDueInMonth(userId, month, year);
  const expensesAll = await prisma.expense.findMany({
    where: {
      postedMonth: month,
      postedYear: year,
      card: { userId },
    },
  });
  const expensesEnCurso = filterExpensesForBudgetLimit(expensesAll);
  const spentImportedTotal = calculateTotalSpent(
    expensesAll.filter((e) => !isExpenseAgainstBudget(e.sourceType)),
  );
  const budget = calculateMonthlyLimit({
    monthlyIncome: config.monthlyIncome,
    allowedPercentage: config.allowedPercentage,
    manualCardLimit: config.manualCardLimit,
    soledadCashTransfer: config.soledadCashTransfer,
    savingsPercentage: config.savingsPercentage,
    cardPaymentsDueInMonth,
  });
  const spent = calculateTotalSpent(expensesEnCurso);
  const spentTotalAll = calculateTotalSpent(expensesAll);
  const remaining = calculateRemaining(budget, spent);
  const percentConsumed = calculatePercentage(spent, budget);
  return {
    config,
    cardPaymentsDueInMonth,
    expenses: expensesEnCurso,
    expensesAll,
    budget,
    /** Gasto que descuenta del límite (manual / en curso) */
    spent,
    /** Total cargado desde resúmenes; no aplica al límite */
    spentImportedTotal,
    /** Suma de todo (informativo) */
    spentTotalAll,
    remaining,
    percentConsumed,
  };
}
