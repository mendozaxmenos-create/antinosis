import { prisma } from "@/lib/prisma";
import {
  calculateMonthlyLimit,
  calculatePercentage,
  calculateRemaining,
  calculateTotalSpent,
} from "@/lib/calculations";
import { filterExpensesForBudgetLimit, isExpenseAgainstBudget } from "@/lib/expense-scope";

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

  const monthlyIncome = 6000;
  const allowedPercentage = 25;
  const computedCardLimit = calculateMonthlyLimit({
    monthlyIncome,
    allowedPercentage,
    manualCardLimit: null,
  });

  return prisma.monthlyBudgetConfig.create({
    data: {
      userId,
      month,
      year,
      monthlyIncome,
      allowedPercentage,
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
    thresholds?: { percentage: number; enabled: boolean }[];
  },
) {
  const computedCardLimit = calculateMonthlyLimit({
    monthlyIncome: data.monthlyIncome,
    allowedPercentage: data.allowedPercentage,
    manualCardLimit: data.manualCardLimit,
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

export async function getMonthFinancials(userId: string, month: number, year: number) {
  const config = await getOrCreateBudgetConfig(userId, month, year);
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
  const budget = config.computedCardLimit;
  const spent = calculateTotalSpent(expensesEnCurso);
  const spentTotalAll = calculateTotalSpent(expensesAll);
  const remaining = calculateRemaining(budget, spent);
  const percentConsumed = calculatePercentage(spent, budget);
  return {
    config,
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
