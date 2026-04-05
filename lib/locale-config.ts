/**
 * Locale y moneda de la UI (montos en pesos argentinos por defecto).
 * Definí `NEXT_PUBLIC_LOCALE` y `NEXT_PUBLIC_CURRENCY` en `.env` / Vercel.
 */

const DEFAULT_LOCALE = "es-AR";
const DEFAULT_CURRENCY = "ARS";

function normalizeLocale(raw: string | undefined): string {
  const s = raw?.trim();
  if (!s) return DEFAULT_LOCALE;
  // BCP 47 básico: letras y guiones
  if (!/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/.test(s)) return DEFAULT_LOCALE;
  return s;
}

function normalizeCurrency(raw: string | undefined): string {
  const s = raw?.trim().toUpperCase();
  if (!s || !/^[A-Z]{3}$/.test(s)) return DEFAULT_CURRENCY;
  return s;
}

export const appLocale = normalizeLocale(process.env.NEXT_PUBLIC_LOCALE);
export const appCurrency = normalizeCurrency(process.env.NEXT_PUBLIC_CURRENCY);

/** Primer segmento de `appLocale` para `<html lang>`. */
export function getHtmlLang(): string {
  const base = appLocale.split("-")[0];
  return base && /^[a-z]{2,3}$/i.test(base) ? base.toLowerCase() : "es";
}
