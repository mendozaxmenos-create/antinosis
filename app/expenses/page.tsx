import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/user";
import { currentMonthYear } from "@/lib/helpers";
import { formatCurrency } from "@/lib/helpers";
import { format } from "date-fns";
import { ExpenseForm } from "@/components/forms/expense-form";
import { DeleteExpenseButton } from "@/components/forms/delete-expense-button";
import { EditExpenseDialog } from "@/components/forms/edit-expense-dialog";
import { redirect } from "next/navigation";
import { expenseWhereTransactionDateInCalendarMonth } from "@/lib/month-transaction-filter";
import { categoriesWhereForExpenseForms } from "@/lib/category-queries";

function expenseSourceLabel(sourceType: string): string {
  const map: Record<string, string> = {
    manual: "Manual",
    imported_file: "Resumen CSV",
    imported_pdf: "Resumen PDF",
    imported_manual: "Resumen manual",
  };
  return map[sourceType] ?? sourceType;
}

export default async function ExpensesPage() {
  const userId = await getDefaultUserId();
  if (!userId) {
    redirect("/setup");
  }
  const { month, year } = currentMonthYear();

  const [cards, expenses] = await Promise.all([
    prisma.creditCard.findMany({ where: { userId, active: true } }),
    prisma.expense.findMany({
      where: { ...expenseWhereTransactionDateInCalendarMonth(month, year), card: { userId } },
      include: { card: true, category: true },
      orderBy: { transactionDate: "desc" },
    }),
  ]);

  const usedCategoryIds = expenses.map((e) => e.categoryId);
  const categories = await prisma.category.findMany({
    where: categoriesWhereForExpenseForms(usedCategoryIds),
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
        <p className="text-muted-foreground">
          Lo que cargás acá como <strong>manual</strong> es el gasto en curso y es lo que cuenta para el límite mensual.
        </p>
      </div>

      <Alert>
        <AlertTitle>Gasto en curso vs resumen importado</AlertTitle>
        <AlertDescription>
          Solo las cargas manuales restan del tope que definís en Presupuesto. Los movimientos que vienen de un CSV de
          resumen se guardan aparte y no afectan ese límite (el cierre del banco suele superarlo).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo gasto</CardTitle>
          <CardDescription>
            Se imputa a {format(new Date(year, month - 1, 1), "MMMM yyyy")} y cuenta como gasto en curso (manual).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a credit card first in <a className="underline" href="/cards">Cards</a>.
            </p>
          ) : (
            <ExpenseForm userId={userId} cards={cards} categories={categories} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos del mes</CardTitle>
          <CardDescription>
            Manual e importados (CSV/PDF). Podés <strong>editar</strong> comercio, descripción o categoría si el resumen
            trae un error (ej. “MAFTA” → nafta).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Comercio</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Tarjeta</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-right w-[180px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{format(e.transactionDate, "d MMM yyyy")}</TableCell>
                  <TableCell>{e.merchant ?? e.description ?? "—"}</TableCell>
                  <TableCell>{e.category.name}</TableCell>
                  <TableCell>
                    {e.card.bank} ·••• {e.card.last4}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{expenseSourceLabel(e.sourceType)}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <EditExpenseDialog userId={userId} cards={cards} categories={categories} expense={e} />
                      <DeleteExpenseButton id={e.id} userId={userId} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
