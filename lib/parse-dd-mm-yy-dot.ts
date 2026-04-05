/** Fecha tipo 02.03.26 (DD.MM.AA) como en resúmenes Hipotecario / algunos PDF. */
export function parseDdMmYyDot(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  year += year >= 70 ? 1900 : 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}
