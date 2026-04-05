import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SettingsBudgetForm } from "@/components/forms/settings-budget-form";
import { IncomeEvolutionChart } from "@/components/charts/income-evolution-chart";
import { currentMonthYear } from "@/lib/helpers";
import { formatCurrency } from "@/lib/helpers";
import { getDefaultUserId } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { getOrCreateBudgetConfig, listBudgetHistory, sumRegisteredNetIncome } from "@/services/budgetService";
import { mapStatementPaymentsDueByCalendarMonth } from "@/services/statementPaymentService";
import { AlertChannelForm } from "@/components/forms/alert-channel-form";
import { redirect } from "next/navigation";
import { Cloud } from "lucide-react";
import { calculateMonthlyLimit } from "@/lib/calculations";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const userId = await getDefaultUserId();
  if (!userId) redirect("/setup");

  const { month: cm, year: cy } = currentMonthYear();
  const rawM = searchParams?.month;
  const rawY = searchParams?.year;
  const month = typeof rawM === "string" && rawM ? Math.min(12, Math.max(1, Number(rawM))) : cm;
  const year =
    typeof rawY === "string" && rawY ? Math.max(2000, Math.min(2100, Number(rawY))) : cy;

  const [config, history, totalNet, userPrefs, paymentsByDueMonth] = await Promise.all([
    getOrCreateBudgetConfig(userId, month, year),
    listBudgetHistory(userId, 200),
    sumRegisteredNetIncome(userId),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { alertChannel: true, alertEmail: true, telegramChatId: true },
    }),
    mapStatementPaymentsDueByCalendarMonth(userId),
  ]);

  const cardPaymentsDueForSelectedMonth = paymentsByDueMonth.get(`${year}-${month}`) ?? 0;

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
          Ingresos, límites, alertas y preferencias de notificación.
        </p>
      </div>

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
            Cada mes cargado con sueldo neto suma al indicador global. Orden cronológico.
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
