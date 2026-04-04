import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getDefaultUserId } from "@/lib/user";
import { getMonthlySummaries } from "@/services/expenseService";
import { getCategoryTotalsForMonth, spendingByCardForMonth } from "@/services/expenseService";
import { MonthComparisonChart } from "@/components/charts/month-comparison-chart";
import { CategoryPie } from "@/components/charts/category-pie";
import { CardSpendChart } from "@/components/charts/card-spend-chart";
import { formatCurrency } from "@/lib/helpers";
import { currentMonthYear } from "@/lib/helpers";
import { format } from "date-fns";

export default async function ReportsPage() {
  const userId = await getDefaultUserId();
  if (!userId) {
    return <p className="text-muted-foreground">Run database seed first.</p>;
  }
  const { month, year } = currentMonthYear();

  const [rows, categoryTotals, cardSpend] = await Promise.all([
    getMonthlySummaries(userId, 12),
    getCategoryTotalsForMonth(userId, month, year),
    spendingByCardForMonth(userId, month, year),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Informes</h1>
        <p className="text-muted-foreground max-w-2xl">
          El límite mensual se compara solo con el gasto en curso (cargas manuales). Los importes desde resumen figuran
          aparte.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparación mensual</CardTitle>
          <CardDescription>
            “Gasto” y “%” usan solo gasto en curso (manual). La columna importado es informativa (resúmenes).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <MonthComparisonChart rows={rows} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Presupuesto</TableHead>
                <TableHead className="text-right">En curso</TableHead>
                <TableHead className="text-right">Importado</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead className="text-right">% límite</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.year}-${r.month}`}>
                  <TableCell>{format(new Date(r.year, r.month - 1, 1), "MMM yyyy")}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.budget)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.spent)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {r.importedSpent > 0 ? formatCurrency(r.importedSpent) : "—"}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(r.difference)}</TableCell>
                  <TableCell className="text-right">{r.percentUsed.toFixed(1)}%</TableCell>
                  <TableCell>
                    {r.exceeded ? (
                      <Badge variant="destructive">Excedido</Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gasto por categoría</CardTitle>
            <CardDescription>En curso (manual) · {format(new Date(year, month - 1, 1), "MMMM yyyy")}</CardDescription>
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
    </div>
  );
}
