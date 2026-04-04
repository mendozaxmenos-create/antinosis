import { BudgetForm } from "@/components/forms/budget-form";
import { currentMonthYear } from "@/lib/helpers";
import { getDefaultUserId } from "@/lib/user";
import { getOrCreateBudgetConfig } from "@/services/budgetService";
import { format } from "date-fns";

export default async function BudgetPage() {
  const userId = await getDefaultUserId();
  if (!userId) {
    return <p className="text-muted-foreground">Run database seed first.</p>;
  }
  const { month, year } = currentMonthYear();
  const config = await getOrCreateBudgetConfig(userId, month, year);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Budget</h1>
        <p className="text-muted-foreground">
          Configure limits for {format(new Date(year, month - 1, 1), "MMMM yyyy")}
        </p>
      </div>
      <BudgetForm
        userId={userId}
        month={month}
        year={year}
        initial={{
          monthlyIncome: config.monthlyIncome,
          allowedPercentage: config.allowedPercentage,
          manualCardLimit: config.manualCardLimit,
          computedCardLimit: config.computedCardLimit,
          thresholds: config.alertThresholds.map((t) => ({
            percentage: t.percentage,
            enabled: t.enabled,
          })),
        }}
      />
    </div>
  );
}
