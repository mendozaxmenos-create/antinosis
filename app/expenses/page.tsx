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
import { redirect } from "next/navigation";

export default async function ExpensesPage() {
  const userId = await getDefaultUserId();
  if (!userId) {
    redirect("/setup");
  }
  const { month, year } = currentMonthYear();

  const [cards, categories, expenses] = await Promise.all([
    prisma.creditCard.findMany({ where: { userId, active: true } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.expense.findMany({
      where: { postedMonth: month, postedYear: year, card: { userId } },
      include: { card: true, category: true },
      orderBy: { transactionDate: "desc" },
    }),
  ]);

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
          <CardTitle>This month</CardTitle>
          <CardDescription>All tracked expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{format(e.transactionDate, "MMM d, yyyy")}</TableCell>
                  <TableCell>{e.merchant ?? e.description ?? "—"}</TableCell>
                  <TableCell>{e.category.name}</TableCell>
                  <TableCell>
                    {e.card.bank} ·••• {e.card.last4}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{e.sourceType}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="text-right">
                    <DeleteExpenseButton id={e.id} userId={userId} month={e.postedMonth} year={e.postedYear} />
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
