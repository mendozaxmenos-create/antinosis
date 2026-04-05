import { prisma } from "@/lib/prisma";
import {
  calculateMonthlyLimit,
  calculatePercentage,
  calculateTotalSpent,
  compareMonths,
  groupByCategory,
} from "@/lib/calculations";
import type { MonthSummary } from "@/lib/calculations";
import { filterExpensesForBudgetLimit, isExpenseAgainstBudget } from "@/lib/expense-scope";
import { mapStatementPaymentsDueByCalendarMonth } from "@/services/statementPaymentService";
import { expenseWhereTransactionDateInCalendarMonth } from "@/lib/month-transaction-filter";

export async function listExpensesForMonth(userId: string, month: number, year: number) {
  return prisma.expense.findMany({
    where: {
      ...expenseWhereTransactionDateInCalendarMonth(month, year),
      card: { userId },
    },
    include: { card: true, category: true },
    orderBy: { transactionDate: "desc" },
  });
}

/** Totales por categoría solo para gastos que cuentan para el límite (en curso). */
export async function getCategoryTotalsForMonth(userId: string, month: number, year: number) {
  const expenses = await prisma.expense.findMany({
    where: {
      ...expenseWhereTransactionDateInCalendarMonth(month, year),
      card: { userId },
    },
    include: { category: true },
  });
  const enCurso = filterExpensesForBudgetLimit(expenses);
  return groupByCategory(
    enCurso.map((e) => ({ categoryName: e.category.name, amount: e.amount })),
  );
}

export async function getMonthlySummaries(
  userId: string,
  monthsBack: number,
): Promise<MonthSummary[]> {
  const now = new Date();
  const summaries: MonthSummary[] = [];
  const paymentsByDueMonth = await mapStatementPaymentsDueByCalendarMonth(userId);
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const config = await prisma.monthlyBudgetConfig.findUnique({
      where: { userId_month_year: { userId, month, year } },
    });
    const expenses = await prisma.expense.findMany({
      where: { ...expenseWhereTransactionDateInCalendarMonth(month, year), card: { userId } },
    });
    const cardPaymentsDueInMonth = paymentsByDueMonth.get(`${year}-${month}`) ?? 0;
    const budget = config
      ? calculateMonthlyLimit({
          monthlyIncome: config.monthlyIncome,
          allowedPercentage: config.allowedPercentage,
          manualCardLimit: config.manualCardLimit,
          soledadCashTransfer: config.soledadCashTransfer,
          savingsPercentage: config.savingsPercentage,
          cardPaymentsDueInMonth,
        })
      : 0;
    const enCurso = filterExpensesForBudgetLimit(expenses);
    const spent = calculateTotalSpent(enCurso);
    const importedSpent = calculateTotalSpent(expenses.filter((e) => !isExpenseAgainstBudget(e.sourceType)));
    const percentUsed = calculatePercentage(spent, budget);
    summaries.push({
      month,
      year,
      budget,
      spent,
      importedSpent,
      difference: budget - spent,
      percentUsed,
      exceeded: spent > budget,
    });
  }
  return compareMonths(summaries);
}

/** Gasto por tarjeta solo en movimientos que cuentan para el límite. */
export async function spendingByCardForMonth(userId: string, month: number, year: number) {
  const expenses = filterExpensesForBudgetLimit(
    await prisma.expense.findMany({
      where: { ...expenseWhereTransactionDateInCalendarMonth(month, year), card: { userId } },
      include: { card: true },
    }),
  );
  const map = new Map<string, { label: string; amount: number }>();
  for (const e of expenses) {
    const key = e.cardId;
    const label = `${e.card.bank} ·••• ${e.card.last4}`;
    const cur = map.get(key);
    if (cur) cur.amount += e.amount;
    else map.set(key, { label, amount: e.amount });
  }
  return Array.from(map.values());
}
