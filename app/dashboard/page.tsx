import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetGauge } from "@/components/dashboard/budget-gauge";
import { CategoryPie } from "@/components/charts/category-pie";
import { MonthComparisonChart } from "@/components/charts/month-comparison-chart";
import { CardSpendChart } from "@/components/charts/card-spend-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, isCalendarMonthCurrent } from "@/lib/helpers";
import { parseMonthYearFromSearchParams } from "@/lib/parse-month-year-params";
import { MonthYearUrlNav } from "@/components/month-year-url-nav";
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
import { getStatementPaymentsBreakdownForMonth } from "@/services/statementPaymentService";
import { format } from "date-fns";
import { Bell, CalendarClock, PiggyBank, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { explainBudgetComputation, explainOverspendVersusSavings } from "@/lib/calculations";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const userId = await getDefaultUserId();
  if (!userId) {
    redirect("/setup");
  }

  const { month, year } = parseMonthYearFromSearchParams(searchParams);
  const monthLabels = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString("es-AR", { month: "long" }),
  }));
  const { budget, spent, spentImportedTotal, remaining, percentConsumed, config, cardPaymentsDueInMonth } =
    await getMonthFinancials(userId, month, year);
  await syncAlertsForMonth(userId, month, year, percentConsumed, config.id);

  const [
    categoryTotals,
    monthRows,
    cardSpend,
    alerts,
    recentExpenses,
    totalNetRegistered,
    monthsWithIncome,
    paymentBreakdown,
    creditCardCount,
  ] = await Promise.all([
    getCategoryTotalsForMonth(userId, month, year),
    getMonthlySummaries(userId, 6),
    spendingByCardForMonth(userId, month, year),
    listDashboardAlerts(userId, month, year, 12),
    listExpensesForMonth(userId, month, year),
    sumRegisteredNetIncome(userId),
    countMonthsWithNetIncome(userId),
    getStatementPaymentsBreakdownForMonth(userId, month, year),
    prisma.creditCard.count({ where: { userId } }),
  ]);

  const hasNetIncomeForMonth =
    config.monthlyIncome != null && Number(config.monthlyIncome) > 0;
  const showOnboarding = creditCardCount === 0 || !hasNetIncomeForMonth;

  const breakdown = explainBudgetComputation({
    monthlyIncome: config.monthlyIncome,
    allowedPercentage: config.allowedPercentage,
    manualCardLimit: config.manualCardLimit,
    soledadCashTransfer: config.soledadCashTransfer,
    savingsPercentage: config.savingsPercentage,
    cardPaymentsDueInMonth,
  });

  const overspendInfo = explainOverspendVersusSavings({
    budgetLimit: budget,
    spentManual: spent,
    savingsAmountPlanned: breakdown.savingsAmount,
  });

  const topCategory = categoryTotals[0]?.categoryName;
  const insights: string[] = [
    `El tope sale del sueldo neto de Configuración (${format(new Date(year, month - 1, 1), "MMMM")}), menos Soledad, menos el % de ahorro sobre eso. Los resúmenes de tarjeta no restan del CuantoQueda.`,
    `Gasto manual del mes: ${percentConsumed.toFixed(0)}% del tope.`,
    topCategory
      ? `La categoría con más gasto manual es ${topCategory}.`
      : "Cargá gastos manuales para ver categorías.",
    remaining >= 0
      ? `Te quedan ${formatCurrency(remaining)} para seguir cargando manual.`
      : overspendInfo.savingsPlanned > 0
        ? `Exceso sobre el tope: ${formatCurrency(overspendInfo.overspend)}. Se descuenta del ahorro previsto (${formatCurrency(overspendInfo.absorbedFromSavings)}); ahorro efectivo restante: ${formatCurrency(overspendInfo.effectiveSavingsRemaining)}.` +
          (overspendInfo.beyondSavings > 0
            ? ` Además ${formatCurrency(overspendInfo.beyondSavings)} superan incluso ese colchón.`
            : "")
        : `Superaste el tope en ${formatCurrency(overspendInfo.overspend)}; con 0% ahorro previsto no hay colchón que absorba el exceso.`,
    spentImportedTotal > 0
      ? `Importado desde resúmenes en el mes (movimientos): ${formatCurrency(spentImportedTotal)} — informativo, no resta del tope.`
      : "Podés importar resúmenes para ver cuánto vence en tarjeta (referencia).",
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CuantoQueda</h1>
          <p className="text-muted-foreground">
            Mes del panel · {format(new Date(year, month - 1, 1), "MMMM yyyy")}
            {!isCalendarMonthCurrent(month, year) ? (
              <span className="text-amber-700 dark:text-amber-400"> · no es el mes calendario actual</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
          <MonthYearUrlNav pathname="/dashboard" month={month} year={year} monthLabels={monthLabels} />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/settings?month=${month}&year=${year}`}>Configuración e ingresos</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/expenses?month=${month}&year=${year}`}>Agregar gasto</Link>
            </Button>
          </div>
        </div>
      </div>

      {showOnboarding ? (
        <div className="space-y-3">
          {creditCardCount === 0 ? (
            <Alert className="border-primary/30 bg-primary/5">
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Empezá con una tarjeta</AlertTitle>
              <AlertDescription className="text-sm leading-relaxed">
                Todavía no cargaste ninguna. En{" "}
                <Link href="/cards" className="font-medium text-foreground underline underline-offset-4">
                  Cards
                </Link>{" "}
                podés dar de alta banco, cierre y vencimiento: hace falta para importar resúmenes y ver el gasto por
                plástico en este panel.
              </AlertDescription>
            </Alert>
          ) : null}
          {!hasNetIncomeForMonth ? (
            <Alert className="border-amber-600/40 bg-amber-500/5 dark:border-amber-500/35">
              <Wallet className="h-4 w-4 text-amber-800 dark:text-amber-400" />
              <AlertTitle>Cargá el sueldo neto de este mes</AlertTitle>
              <AlertDescription className="text-sm leading-relaxed">
                Sin ingreso neto en{" "}
                <strong>
                  {format(new Date(year, month - 1, 1), "MMMM yyyy")}
                </strong>{" "}
                el tope queda en cero o sin base clara. Entrá a{" "}
                <Link
                  href={`/settings?month=${month}&year=${year}`}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Configuración
                </Link>{" "}
                y cargá el sueldo (podés estimarlo y corregirlo después).
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      <Alert id="panel-mes-tarjeta">
        <AlertTitle>Lectura simple</AlertTitle>
        <AlertDescription className="text-sm leading-relaxed">
          Elegís el mes arriba. El <strong>sueldo neto</strong> de ese mes (en Configuración) menos <strong>Soledad</strong> y el{" "}
          <strong>% de ahorro</strong> define el <strong>tope para gastos manuales</strong>. Ahí cargás lo que gastás en el día a día:
          eso es lo que <strong>resta del CuantoQueda</strong>. Los <strong>resúmenes importados</strong> muestran cuánto pagás de
          tarjeta por vencimiento, pero <strong>no bajan</strong> ese disponible.
        </AlertDescription>
      </Alert>

      <section aria-labelledby="dashboard-kpis-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="dashboard-kpis-heading" className="text-sm font-medium text-muted-foreground">
            Números del mes
          </h2>
          <Link
            href={`/settings?month=${month}&year=${year}`}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Editar sueldo y reglas
          </Link>
        </div>

        <Card className="border-2 border-primary/35 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl tracking-tight">CuantoQueda</CardTitle>
            <CardDescription>
              Tope de gasto manual − cargas manuales del mes. Los resúmenes no intervienen acá.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className={`text-4xl font-bold tabular-nums tracking-tight ${
                  remaining >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                }`}
              >
                {formatCurrency(remaining)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {percentConsumed.toFixed(0)}% del tope usado · tope {formatCurrency(budget)} · gastado manual{" "}
                {formatCurrency(spent)}
              </p>
            </div>
            <Button asChild variant="secondary" size="sm" className="shrink-0">
              <Link href={`/expenses?month=${month}&year=${year}`}>Cargar gasto manual</Link>
            </Button>
          </CardContent>
        </Card>

        {overspendInfo.overspend > 0 ? (
          <Alert
            variant={overspendInfo.beyondSavings > 0 ? "destructive" : "default"}
            className={
              overspendInfo.beyondSavings > 0
                ? undefined
                : "border-amber-600/50 bg-amber-500/5 dark:border-amber-500/40"
            }
          >
            <AlertTitle>
              {overspendInfo.savingsPlanned > 0
                ? "Exceso imputado al ahorro previsto"
                : "Exceso sobre el tope"}
            </AlertTitle>
            <AlertDescription className="space-y-2 text-sm leading-relaxed">
              {overspendInfo.savingsPlanned > 0 ? (
                <>
                  <p>
                    El gasto manual supera el tope en <strong>{formatCurrency(overspendInfo.overspend)}</strong>. Ese
                    exceso se descuenta del <strong>porcentaje de ahorro</strong> previsto: el monto que separaste para
                    ahorro era <strong>{formatCurrency(overspendInfo.savingsPlanned)}</strong>; de ahí se usan{" "}
                    <strong>{formatCurrency(overspendInfo.absorbedFromSavings)}</strong> para cubrir el exceso.
                  </p>
                  <p>
                    <strong>Ahorro efectivo restante:</strong> {formatCurrency(overspendInfo.effectiveSavingsRemaining)}.
                  </p>
                  {overspendInfo.beyondSavings > 0 ? (
                    <p>
                      El exceso supera el ahorro previsto: <strong>{formatCurrency(overspendInfo.beyondSavings)}</strong>{" "}
                      quedan fuera de lo que la regla del mes podía absorber.
                    </p>
                  ) : null}
                </>
              ) : (
                <p>
                  Gastaste <strong>{formatCurrency(overspendInfo.overspend)}</strong> por encima del tope. Con{" "}
                  <strong>0% de ahorro</strong> en la configuración no hay monto de “colchón” que absorba el exceso: todo
                  queda como desvío sobre el tope.
                </p>
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-muted">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Sueldo neto</CardDescription>
              <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(breakdown.netSalary)}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(year, month - 1, 1), "MMMM yyyy")} · editable en Config.
              </p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">A Soledad</CardDescription>
              <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(breakdown.soledadCash)}</p>
              <p className="text-xs text-muted-foreground">Se resta primero</p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Neto − Soledad</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(breakdown.baseForSavings)}</p>
              <p className="text-xs text-muted-foreground">Acá aplica el % de ahorro</p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">% Ahorro</CardDescription>
              <PiggyBank className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{breakdown.savingsPct.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Sobre neto − Soledad</p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Ahorro (estim.)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(breakdown.savingsAmount)}</p>
              <p className="text-xs text-muted-foreground">Descontado del tope</p>
              {overspendInfo.overspend > 0 && breakdown.savingsAmount > 0 ? (
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-2 pt-2 border-t border-border/60">
                  Tras absorber el exceso:{" "}
                  <span className="font-medium tabular-nums">
                    {formatCurrency(overspendInfo.effectiveSavingsRemaining)}
                  </span>
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card className="border-primary/25 bg-primary/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide text-foreground/85">
                Tope gasto manual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(budget)}</p>
              {breakdown.manualOverride != null ? (
                <p className="text-xs text-muted-foreground">Tope manual</p>
              ) : (
                <p className="text-xs text-muted-foreground">Regla del mes</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Gasto manual</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(spent)}</p>
              <p className="text-xs text-muted-foreground">Resta del CuantoQueda</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Suma ingresos (hist.)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(totalNetRegistered)}</p>
              <p className="text-xs text-muted-foreground">
                {monthsWithIncome} mes{monthsWithIncome === 1 ? "" : "es"} ·{" "}
                <Link href={`/settings?month=${month}&year=${year}`} className="underline">
                  Evolución
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Solo referencia (no resta del tope)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-dashed border-muted-foreground/40 bg-muted/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wide">
                  A pagar por resúmenes (vencen este mes)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-semibold tabular-nums">{formatCurrency(breakdown.cardPaymentsDue)}</p>
                <p className="text-xs text-muted-foreground">
                  Total ARS importado (pesos + USD a tipo BCRA). Suele ser el cierre de un mes y pagarse en el siguiente: no
                  entra en el CuantoQueda.
                </p>
                {paymentBreakdown.subtotalUsdOriginal > 0 ? (
                  <div className="rounded-md border border-dashed bg-background/80 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
                    <span className="font-medium text-foreground">Desglose:</span> pesos{" "}
                    {formatCurrency(paymentBreakdown.subtotalArsNative)} · USD{" "}
                    {paymentBreakdown.subtotalUsdOriginal.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    → {formatCurrency(paymentBreakdown.subtotalUsdAsArs)} ARS
                  </div>
                ) : breakdown.cardPaymentsDue > 0 ? (
                  <p className="text-xs text-muted-foreground">Solo pesos en los resúmenes.</p>
                ) : null}
              </CardContent>
            </Card>
            <Card className="border-dashed border-muted-foreground/40 bg-muted/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wide">
                  Movimientos importados (mes contable)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{formatCurrency(spentImportedTotal)}</p>
                <p className="text-xs text-muted-foreground">Suma de líneas de resúmenes en el mes; informativo.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {paymentBreakdown.byCard.length > 0 && (paymentBreakdown.byCard.length > 1 || paymentBreakdown.subtotalUsdOriginal > 0) ? (
          <Card className="border-muted/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por tarjeta — resúmenes con vencimiento este mes</CardTitle>
              <CardDescription>
                Total en ARS por plástico; USD del resumen convertidos con cotización BCRA del día de cada consumo al importar.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarjeta</TableHead>
                    <TableHead className="text-right">Pesos (ARS)</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead className="text-right">USD en ARS</TableHead>
                    <TableHead className="text-right">Total ARS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentBreakdown.byCard.map((c) => (
                    <TableRow key={c.cardId}>
                      <TableCell>
                        {c.bank} ·••• {c.last4}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(c.arsNative)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.usdOriginal > 0
                          ? `US$ ${c.usdOriginal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.usdAsArs > 0 ? formatCurrency(c.usdAsArs) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(c.totalArs)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Barra del tope</CardTitle>
            <CardDescription>
              Gasto manual vs tope del mes. Los resúmenes no mueven esta barra.
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
            <CardDescription>
              En curso (manual) · {format(new Date(year, month - 1, 1), "MMMM yyyy")}
            </CardDescription>
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
              <Link href={`/expenses?month=${month}&year=${year}`}>Ver todos los gastos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
