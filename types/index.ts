import type { CreditCard, Category, Expense, MonthlyBudgetConfig } from "@prisma/client";

export type ExpenseWithRelations = Expense & {
  card: CreditCard;
  category: Category;
};

export type BudgetWithThresholds = MonthlyBudgetConfig & {
  alertThresholds: { id: string; percentage: number; enabled: boolean }[];
};

export type DashboardStats = {
  budget: number;
  spent: number;
  remaining: number;
  percentConsumed: number;
  month: number;
  year: number;
};
