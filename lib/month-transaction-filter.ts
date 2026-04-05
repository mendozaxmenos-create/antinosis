import { endOfMonth, startOfMonth } from "date-fns";

/** Rango inclusive para filtrar gastos por mes calendario de la fecha de operación. */
export function transactionDateRangeForCalendarMonth(month: number, year: number): { gte: Date; lte: Date } {
  const ref = new Date(year, month - 1, 1);
  return {
    gte: startOfMonth(ref),
    lte: endOfMonth(ref),
  };
}

/** Fragmento Prisma para `Expense`: movimientos cuya fecha de operación cae en el mes calendario. */
export function expenseWhereTransactionDateInCalendarMonth(month: number, year: number) {
  const { gte, lte } = transactionDateRangeForCalendarMonth(month, year);
  return { transactionDate: { gte, lte } };
}
