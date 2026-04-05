import { format, isValid } from "date-fns";

/** Evita 500 si una fecha es inválida o viene mal de la BD (date-fns `format` lanza). */
export function safeFormatDate(d: Date | null | undefined, pattern: string, empty = "—"): string {
  if (d == null) return empty;
  if (!isValid(d)) return empty;
  try {
    return format(d, pattern);
  } catch {
    return empty;
  }
}

/** Mes/año contable para tablas (importMonth 1–12). */
export function safeFormatMonthYearLabel(month: number, year: number, pattern: string, empty = "—"): string {
  if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) return empty;
  const d = new Date(year, month - 1, 1);
  if (!isValid(d)) return empty;
  try {
    return format(d, pattern);
  } catch {
    return empty;
  }
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMonthYear(month: number, year: number): string {
  const d = new Date(year, month - 1, 1);
  return format(d, "MMMM yyyy");
}

export function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
