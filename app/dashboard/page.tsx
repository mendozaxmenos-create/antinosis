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
import { countMonthsWithNetIncome, getMonthFinancials, sumRegisteredNetIncome } from "@/services/budgetService";
import {
  getCategoryTotalsForMonth,
  getMonthlySummaries,
  listExpensesForMonth,
  spendingByCardForMonth,
} from "@/services/expenseService";
import { listDashboardAlerts } from "@/services/alertService";
import { syncAlertsForMonth } from "@/services/alertService";
import { format } from "date-fns";
import { Bell, CalendarClock, PiggyBank, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { explainBudgetComputation } from "@/lib/calculations";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const userId = await getDefaultUserId();
  if (!userId) {
    redirect("/setup");
  }

  const { month, year } = currentMonthYear();
  const { budget, spent, spentImportedTotal, remaining, percentConsumed, config } = await getMonthFinancials(
    userId,
    month,
    year,
  );
  await syncAlertsForMonth(userId, month, year, percentConsumed, config.id);

  const [categoryTotals, monthRows, cardSpend, alerts, recentExpenses, totalNetRegistered, monthsWithIncome] =
    await Promise.all([
      getCategoryTotalsForMonth(userId, month, year),
      getMonthlySummaries(userId, 6),
      spendingByCardForMonth(userId, month, year),
      listDashboardAlerts(userId, month, year, 12),
      listExpensesForMonth(userId, month, year),
      sumRegisteredNetIncome(userId),
      countMonthsWithNetIncome(userId),
    ]);

  const breakdown = explainBudgetComputation({
    monthlyIncome: config.monthlyIncome,
    allowedPercentage: config.allowedPercentage,
    manualCardLimit: config.manualCardLimit,
    soledadCashTransfer: config.soledadCashTransfer,
    savingsPercentage: config.savingsPercentage,
  });

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
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">Configuración e ingresos</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/expenses">Agregar gasto</Link>
          </Button>
        </div>
      </div>

      <section aria-labelledby="dashboard-kpis-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="dashboard-kpis-heading" className="text-sm font-medium text-muted-foreground">
            Indicadores del mes
          </h2>
          <Link
            href="/settings"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Editar en Configuración
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card className="border-muted">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Sueldo neto</CardDescription>
              <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(breakdown.netSalary)}</p>
              <p className="text-xs text-muted-foreground">Mes contable actual</p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">A Soledad (efectivo)</CardDescription>
              <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(breakdown.soledadCash)}</p>
              <p className="text-xs text-muted-foreground">Descontado del neto</p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Disponible (post-Soledad)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(breakdown.baseAfterSoledad)}</p>
              <p className="text-xs text-muted-foreground">Base antes del ahorro</p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">% Ahorro</CardDescription>
              <PiggyBank className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{breakdown.savingsPct.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Sobre el disponible</p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Monto ahorro (estim.)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(breakdown.savingsAmount)}</p>
              <p className="text-xs text-muted-foreground">Según regla del mes</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide text-foreground/80">
                Límite tarjeta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(budget)}</p>
              {breakdown.manualOverride != null ? (
                <p className="text-xs text-muted-foreground">Tope manual aplicado</p>
              ) : (
                <p className="text-xs text-muted-foreground">Presupuesto en curso</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Gasto en curso</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(spent)}</p>
              <p className="text-xs text-muted-foreground">Manual · cuenta para el límite</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Importado (resúmenes)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(spentImportedTotal)}</p>
              <p className="text-xs text-muted-foreground">No resta del límite</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Saldo vs límite</CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-semibold tabular-nums ${
                  remaining >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                }`}
              >
                {formatCurrency(remaining)}
              </p>
              <p className="text-xs text-muted-foreground">Disponible bajo el tope</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Uso del límite</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{percentConsumed.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Gasto manual / límite</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Suma ingresos (hist.)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(totalNetRegistered)}</p>
              <p className="text-xs text-muted-foreground">
                {monthsWithIncome} mes{monthsWithIncome === 1 ? "" : "es"} con sueldo ·{" "}
                <Link href="/settings" className="underline">
                  Evolución
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

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
