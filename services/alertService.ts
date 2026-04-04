import { prisma } from "@/lib/prisma";
import { checkThresholds } from "@/lib/calculations";

/**
 * Evaluates spend vs budget and creates AlertEvent rows for newly crossed thresholds.
 */
export async function syncAlertsForMonth(
  userId: string,
  month: number,
  year: number,
  percentConsumed: number,
  budgetConfigId: string,
) {
  const config = await prisma.monthlyBudgetConfig.findUniqueOrThrow({
    where: { id: budgetConfigId },
    include: { alertThresholds: true },
  });

  const crossed = checkThresholds(percentConsumed, config.alertThresholds);
  if (crossed.length === 0) return;

  const existing = await prisma.alertEvent.findMany({
    where: { userId, month, year, alertKind: "threshold" },
    select: { thresholdPercentage: true },
  });
  const existingSet = new Set(
    existing.map((e) => e.thresholdPercentage).filter((p): p is number => p != null),
  );

  const toCreate = crossed.filter((p) => !existingSet.has(p));
  if (toCreate.length === 0) return;

  await prisma.alertEvent.createMany({
    data: toCreate.map((thresholdPercentage) => ({
      userId,
      month,
      year,
      alertKind: "threshold",
      thresholdPercentage,
      message: `${thresholdPercentage}% of monthly budget reached`,
    })),
  });
}

/** Alertas de umbral del mes actual + próximos vencimientos de pago (importaciones). */
export async function listDashboardAlerts(userId: string, month: number, year: number, take = 20) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [threshold, paymentDue] = await Promise.all([
    prisma.alertEvent.findMany({
      where: { userId, month, year, alertKind: "threshold" },
      orderBy: { triggeredAt: "desc" },
      take: 15,
    }),
    prisma.alertEvent.findMany({
      where: {
        userId,
        alertKind: "payment_due",
        dueDate: { gte: startOfToday },
      },
      orderBy: { dueDate: "asc" },
      take: 15,
    }),
  ]);

  const byDue = [...paymentDue].sort(
    (a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0),
  );
  const byTime = [...threshold].sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  return [...byDue, ...byTime].slice(0, take);
}

/** @deprecated Usar listDashboardAlerts */
export async function listRecentAlerts(userId: string, month: number, year: number, take = 20) {
  return listDashboardAlerts(userId, month, year, take);
}
