import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SettingsBudgetForm } from "@/components/forms/settings-budget-form";
import { IncomeEvolutionChart } from "@/components/charts/income-evolution-chart";
import { parseMonthYearFromSearchParams } from "@/lib/parse-month-year-params";
import { formatCurrency } from "@/lib/helpers";
import { getDefaultUserId } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { getOrCreateBudgetConfig, listBudgetHistory, sumRegisteredNetIncome } from "@/services/budgetService";
import { mapStatementPaymentsDueByCalendarMonth } from "@/services/statementPaymentService";
import { AlertChannelForm } from "@/components/forms/alert-channel-form";
import { CategoriesManager } from "@/components/forms/categories-manager";
import { redirect } from "next/navigation";
import { Cloud } from "lucide-react";
import { calculateMonthlyLimit } from "@/lib/calculations";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const userId = await getDefaultUserId();
  if (!userId) redirect("/setup");

  const { month, year } = parseMonthYearFromSearchParams(searchParams);

  const [config, history, totalNet, userPrefs, paymentsByDueMonth, categoriesWithCount] = await Promise.all([
    getOrCreateBudgetConfig(userId, month, year),
    listBudgetHistory(userId, 200),
    sumRegisteredNetIncome(userId),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { alertChannel: true, alertEmail: true, telegramChatId: true },
    }),
    mapStatementPaymentsDueByCalendarMonth(userId),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { expenses: true } } },
    }),
  ]);

  const cardPaymentsDueForSelectedMonth = paymentsByDueMonth.get(`${year}-${month}`) ?? 0;
  const hasSalaryForMonth =
    config.monthlyIncome != null && Number(config.monthlyIncome) > 0;
  const showSalaryReminder =
    cardPaymentsDueForSelectedMonth > 0 && !hasSalaryForMonth;

  const monthLabels = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString("es-AR", { month: "long" }),
  }));

  const withIncome = history
    .filter((h) => h.monthlyIncome != null && h.monthlyIncome > 0)
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));

  const chartData = withIncome.map((h) => ({
    key: `${h.year}-${h.month}`,
    label: `${String(h.month).padStart(2, "0")}/${h.year}`,
    income: h.monthlyIncome!,
  }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Ingresos, límites, categorías de gastos, alertas y preferencias de notificación.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorías de gastos</CardTitle>
          <CardDescription>
            Se usan en gastos manuales, importaciones y el gráfico del panel. Las archivadas no aparecen en cargas
            nuevas; los movimientos viejos siguen mostrando el nombre. Solo podés eliminar una categoría si no tiene
            gastos asociados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoriesManager
            initialCategories={categoriesWithCount.map((c) => ({
              id: c.id,
              name: c.name,
              active: c.active,
              expenseCount: c._count.expenses,
            }))}
          />
        </CardContent>
      </Card>

      <AlertChannelForm
        userId={userId}
        initial={{
          alertChannel: userPrefs.alertChannel,
          alertEmail: userPrefs.alertEmail,
          telegramChatId: userPrefs.telegramChatId,
        }}
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <CardTitle className="text-base">Datos en la nube</CardTitle>
            <CardDescription>
              Todo lo que guardás acá se persiste en la base PostgreSQL (por ejemplo Neon) vinculada al deploy. No se
              pierde al cerrar el navegador ni al cambiar de dispositivo: usá la misma URL y la misma cuenta de datos.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {showSalaryReminder ? (
        <Alert>
          <AlertTitle>Resúmenes con vencimiento en este mes</AlertTitle>
          <AlertDescription>
            Ya hay pagos de tarjeta importados para{" "}
            <strong>
              {String(month).padStart(2, "0")}/{year}
            </strong>
            . Cargá el <strong>sueldo neto</strong> abajo (aunque sea estimado) para que el límite y la evolución
            tengan sentido. Ese valor es el que queda guardado por mes: podés corregirlo cuando tengas el monto
            definitivo o un aumento.
          </AlertDescription>
        </Alert>
      ) : null}

      <SettingsBudgetForm
        userId={userId}
        month={month}
        year={year}
        monthLabels={monthLabels}
        cardPaymentsDueInMonth={cardPaymentsDueForSelectedMonth}
        initial={{
          monthlyIncome: config.monthlyIncome,
          soledadCashTransfer: config.soledadCashTransfer ?? 0,
          savingsPercentage: config.savingsPercentage,
          allowedPercentage: config.allowedPercentage,
          manualCardLimit: config.manualCardLimit,
          thresholds: config.alertThresholds.map((t) => ({
            percentage: t.percentage,
            enabled: t.enabled,
          })),
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Evolución del sueldo neto</CardTitle>
          <CardDescription>
            Cada punto es el <strong>sueldo neto guardado</strong> en la configuración de ese mes (el mismo que usás en
            el límite). Podés estimarlo antes de cobrar y editarlo después; no se infiere desde los resúmenes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IncomeEvolutionChart
            data={chartData}
            totalLabel={`Suma de sueldos netos registrados: ${formatCurrency(totalNet)} (${withIncome.length} meses con dato)`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico por mes</CardTitle>
          <CardDescription>Sueldo neto y límite calculado guardados por mes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Sueldo neto</TableHead>
                <TableHead className="text-right">Soledad</TableHead>
                <TableHead className="text-right">% ahorro</TableHead>
                <TableHead className="text-right">Límite tarjeta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Sin registros todavía.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      {String(h.month).padStart(2, "0")}/{h.year}
                    </TableCell>
                    <TableCell className="text-right">
                      {h.monthlyIncome != null ? formatCurrency(h.monthlyIncome) : "—"}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(h.soledadCashTransfer ?? 0)}</TableCell>
                    <TableCell className="text-right">
                      {h.savingsPercentage != null
                        ? `${h.savingsPercentage}%`
                        : h.allowedPercentage != null
                          ? `${(100 - h.allowedPercentage).toFixed(0)}% (leg.)`
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(
                        calculateMonthlyLimit({
                          monthlyIncome: h.monthlyIncome,
                          allowedPercentage: h.allowedPercentage,
                          manualCardLimit: h.manualCardLimit,
                          soledadCashTransfer: h.soledadCashTransfer,
                          savingsPercentage: h.savingsPercentage,
                          cardPaymentsDueInMonth: paymentsByDueMonth.get(`${h.year}-${h.month}`) ?? 0,
                        }),
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
