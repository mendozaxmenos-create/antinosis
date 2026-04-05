/**
 * Montos tipo AR: $ 23.599,00 · U$S 6,00 · 1.234,56
 */

export function parseAmountAr(raw: string): number | null {
  if (!raw?.trim()) return null;
  const s = raw
    .trim()
    .replace(/U\$S/gi, "")
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .trim();
  if (!s) return null;

  if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(s)) {
    return Math.abs(parseFloat(s.replace(/\./g, "").replace(",", ".")));
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    return Math.abs(parseFloat(s.replace(/\./g, "")));
  }
  if (/^\d+[.,]\d{1,2}$/.test(s)) {
    const norm =
      s.includes(",") && s.lastIndexOf(",") > s.lastIndexOf(".")
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
    const n = parseFloat(norm);
    return Number.isFinite(n) ? Math.abs(n) : null;
  }
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? Math.abs(n) : null;
}
