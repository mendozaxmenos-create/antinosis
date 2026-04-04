/**
 * Tipos de gasto que cuentan contra el límite mensual (gasto "en curso").
 * Los importados desde resumen no aplican: el cierre suele superar el límite que uno se impone.
 * En el futuro: agregar p. ej. "receipt" / comprobante reenviado.
 */
export const BUDGET_LIMIT_SOURCE_TYPES = ["manual"] as const;

export type BudgetLimitSourceType = (typeof BUDGET_LIMIT_SOURCE_TYPES)[number];

export function isExpenseAgainstBudget(sourceType: string): boolean {
  return (BUDGET_LIMIT_SOURCE_TYPES as readonly string[]).includes(sourceType);
}

export function filterExpensesForBudgetLimit<T extends { sourceType: string }>(rows: T[]): T[] {
  return rows.filter((e) => isExpenseAgainstBudget(e.sourceType));
}
