/** Meses abreviados en resúmenes AR (inglés / español). */
const MONTH_ABBREV = new Map<string, number>([
  ["ene", 1],
  ["jan", 1],
  ["feb", 2],
  ["mar", 3],
  ["abr", 4],
  ["apr", 4],
  ["may", 5],
  ["jun", 6],
  ["jul", 7],
  ["ago", 8],
  ["aug", 8],
  ["sep", 9],
  ["oct", 10],
  ["nov", 11],
  ["dic", 12],
  ["dec", 12],
]);

/** Fecha tipo `21-Feb-26` o `02-Mar-26` (hora local mediodía). */
export function parseDdMmmYy(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const monKey = m[2]!.toLowerCase();
  const yy = Number(m[3]);
  const month = MONTH_ABBREV.get(monKey);
  if (month == null || day < 1 || day > 31) return null;
  const year = yy < 100 ? 2000 + yy : yy;
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}
