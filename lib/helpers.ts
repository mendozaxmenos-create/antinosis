import { format, isValid } from "date-fns";

/** Evita 500 si una fecha es inválida o viene mal de la BD (date-fns `format` lanza). Acepta ISO string (props cliente). */
export function safeFormatDate(d: Date | string | null | undefined, pattern: string, empty = "—"): string {
  if (d == null) return empty;
  const date = typeof d === "string" ? new Date(d) : d;
  if (!isValid(date)) return empty;
  try {
    return format(date, pattern);
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

export function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
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

export function isCalendarMonthCurrent(month: number, year: number): boolean {
  const now = new Date();
  return month === now.getMonth() + 1 && year === now.getFullYear();
}

/**
 * Fecha por defecto para nuevos gastos manuales cuando el usuario elige un mes en el panel.
 * Si el mes elegido es el actual, usa hoy; si no, día 15 del mes elegido (planificación).
 */
export function defaultExpenseDateForBudgetMonth(month: number, year: number): string {
  const now = new Date();
  const cm = now.getMonth() + 1;
  const cy = now.getFullYear();
  if (month === cm && year === cy) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return `${year}-${String(month).padStart(2, "0")}-15`;
}
