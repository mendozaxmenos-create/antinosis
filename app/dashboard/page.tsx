import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetGauge } from "@/components/dashboard/budget-gauge";
import { CategoryPie } from "@/components/charts/category-pie";
import { MonthComparisonChart } from "@/components/charts/month-comparison-chart";
import { CardSpendChart } from "@/components/charts/card-spend-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/helpers";
import { currentMonthYear } from "@/lib/helpers";
import { getDefaultUserId } from "@/lib/user";
import { getMonthFinancials } from "@/services/budgetService";
import {
  getCategoryTotalsForMonth,
  getMonthlySummaries,
  listExpensesForMonth,
  spendingByCardForMonth,
} from "@/services/expenseService";
import { listDashboardAlerts } from "@/services/alertService";
import { syncAlertsForMonth } from "@/services/alertService";
import { format } from "date-fns";
import { Bell, CalendarClock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const userId = await getDefaultUserId();
  if (!userId) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No user found. Run </p>
        <code className="mt-2 block rounded bg-muted px-2 py-1 text-sm">npm run db:push && npm run db:seed</code>
      </div>
    );
  }

  const { month, year } = currentMonthYear();
  const { budget, spent, spentImportedTotal, remaining, percentConsumed, config } = await getMonthFinancials(
    userId,
    month,
    year,
  );
  await syncAlertsForMonth(userId, month, year, percentConsumed, config.id);

  const [categoryTotals, monthRows, cardSpend, alerts, recentExpenses] = await Promise.all([
    getCategoryTotalsForMonth(userId, month, year),
    getMonthlySummaries(userId, 6),
    spendingByCardForMonth(userId, month, year),
    listDashboardAlerts(userId, month, year, 12),
    listExpensesForMonth(userId, month, year),
  ]);

  const topCategory = categoryTotals[0]?.categoryName;
  const insights: string[] = [
    `Sobre el gasto en curso (manual), usaste ${percentConsumed.toFixed(0)}% del límite mensual.`,
    topCategory
      ? `La categoría con más gasto en curso es ${topCategory}.`
      : "Cargá gastos manuales para ver categorías que cuentan para el límite.",
    remaining >= 0
      ? `Te quedan ${formatCurrency(remaining)} disponibles respecto al límite.`
      : `Vas ${formatCurrency(Math.abs(remaining))} por encima del límite (solo en curso).`,
    spentImportedTotal > 0
      ? `Además tenés ${formatCurrency(spentImportedTotal)} registrados desde resúmenes importados (no afectan el límite).`
      : "El límite aplica solo a lo que cargás manualmente como gasto en curso; los resúmenes importados sirven para registro y calendario.",
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
          <p className="text-muted-foreground">
            Mes en curso · {format(new Date(year, month - 1, 1), "MMMM yyyy")}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/expenses">Agregar gasto</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Presupuesto mensual</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(budget)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gasto en curso (manual)</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(spent)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Disponible (según límite)</CardDescription>
            <CardTitle className="text-2xl text-emerald-700 dark:text-emerald-400">
              {formatCurrency(remaining)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>% del límite (en curso)</CardDescription>
            <CardTitle className="text-2xl">{percentConsumed.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Uso del presupuesto</CardTitle>
            <CardDescription>
              Solo cuenta lo que cargás manualmente; los importes desde resumen no restan del tope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetGauge
              budget={budget}
              spent={spent}
              percentConsumed={percentConsumed}
              importedTotal={spentImportedTotal}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {insights.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gasto por categoría</CardTitle>
            <CardDescription>
              Solo gasto en curso (manual) · {format(new Date(year, month - 1, 1), "MMMM")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPie data={categoryTotals} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gasto por tarjeta</CardTitle>
            <CardDescription>En curso (manual) · mes actual</CardDescription>
          </CardHeader>
          <CardContent>
            <CardSpendChart data={cardSpend} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes a mes</CardTitle>
          <CardDescription>Presupuesto vs gasto (meses recientes)</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthComparisonChart rows={monthRows} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas
            </CardTitle>
            <CardDescription>Umbrales del mes y próximos vencimientos de pago</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay alertas por ahora.</p>
            ) : (
              alerts.map((a) => (
                <Alert key={a.id}>
                  <AlertTitle className="flex items-center gap-2 text-base">
                    {a.alertKind === "payment_due" ? (
                      <>
                        <CalendarClock className="h-4 w-4 shrink-0" />
                        Vencimiento de pago
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4 shrink-0" />
                        {a.thresholdPercentage != null ? `${a.thresholdPercentage}% del presupuesto` : "Presupuesto"}
                      </>
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    {a.message}
                    {a.dueDate ? (
                      <span className="mt-1 block text-foreground/90">
                        Fecha: {format(a.dueDate, "d MMM yyyy")}
                      </span>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos gastos</CardTitle>
            <CardDescription>Actividad reciente</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Comercio</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExpenses.slice(0, 8).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(e.transactionDate, "MMM d")}
                    </TableCell>
                    <TableCell>{e.merchant ?? e.description ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator className="my-4" />
            <Button asChild variant="link" className="px-0">
              <Link href="/expenses">Ver todos los gastos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
