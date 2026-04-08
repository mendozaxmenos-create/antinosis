import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { defaultExpenseDateForBudgetMonth, formatCurrency } from "@/lib/helpers";
import { parseMonthYearFromSearchParams } from "@/lib/parse-month-year-params";
import { MonthYearUrlNav } from "@/components/month-year-url-nav";
import { format } from "date-fns";
import { ExpenseForm } from "@/components/forms/expense-form";
import { DeleteExpenseButton } from "@/components/forms/delete-expense-button";
import { EditExpenseDialog } from "@/components/forms/edit-expense-dialog";
import { redirect } from "next/navigation";
import { expenseWhereTransactionDateInCalendarMonth } from "@/lib/month-transaction-filter";
import { categoriesWhereForExpenseForms } from "@/lib/category-queries";
import { requireAuthSession } from "@/lib/admin-auth";

function expenseSourceLabel(sourceType: string): string {
  const map: Record<string, string> = {
    manual: "Manual",
    imported_file: "Resumen CSV",
    imported_pdf: "Resumen PDF",
    imported_manual: "Resumen manual",
  };
  return map[sourceType] ?? sourceType;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireAuthSession();
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/setup");
  }
  const { month, year } = parseMonthYearFromSearchParams(searchParams);
  const monthLabels = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString("es-AR", { month: "long" }),
  }));
  const defaultTx = defaultExpenseDateForBudgetMonth(month, year);

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground">
            Lo que cargás como <strong>manual</strong> cuenta para el límite de{" "}
            <strong>{format(new Date(year, month - 1, 1), "MMMM yyyy")}</strong> (mismo mes que el panel y
            Configuración).
          </p>
        </div>
        <MonthYearUrlNav pathname="/expenses" month={month} year={year} monthLabels={monthLabels} />
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
            La fecha del movimiento define el mes: si elegís abril, cargá gastos con fecha en abril para que bajen del
            tope de abril.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a credit card first in <a className="underline" href="/cards">Cards</a>.
            </p>
          ) : (
            <ExpenseForm
              userId={userId}
              cards={cards}
              categories={categories}
              defaultTransactionDate={defaultTx}
            />
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
