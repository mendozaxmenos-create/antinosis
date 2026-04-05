import { currentMonthYear } from "@/lib/helpers";

/** Lee `?month=&year=` igual que Configuración; si faltan, usa el mes calendario actual. */
export function parseMonthYearFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): { month: number; year: number } {
  const { month: cm, year: cy } = currentMonthYear();
  const rawM = searchParams?.month;
  const rawY = searchParams?.year;
  let month = cm;
  let year = cy;
  if (typeof rawM === "string" && rawM !== "") {
    const n = Number(rawM);
    if (Number.isFinite(n)) month = Math.min(12, Math.max(1, n));
  }
  if (typeof rawY === "string" && rawY !== "") {
    const n = Number(rawY);
    if (Number.isFinite(n)) year = Math.max(2000, Math.min(2100, n));
  }
  return { month, year };
}
