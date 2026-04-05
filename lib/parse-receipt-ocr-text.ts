/**
 * Interpreta texto devuelto por OCR (capturas Mercado Pago, bancos, etc.).
 * Heurístico: conviene revisar el formulario antes de guardar.
 */

export type ParsedReceipt = {
  amount: number | null;
  /** yyyy-MM-dd para input type="date" */
  transactionDate: string | null;
  merchant: string | null;
  description: string | null;
  confidence: "high" | "medium" | "low";
  rawText: string;
};

const SKIP_LINE = new RegExp(
  [
    "mercado\\s*pago",
    "pago\\s*qr",
    "qr\\s*",
    "comprobante",
    "transacci[oó]n",
    "n[°º]\\s*",
    "n[uú]mero\\s+de\\s+operaci",
    "cuit",
    "cvu",
    "alias",
    "fecha\\s*y\\s*hora",
    "www\\.",
    "http",
    "aceptado",
    "aprobado",
    "pendiente",
  ].join("|"),
  "i",
);

/** Mes en español (minúsculas, sin acento en clave) → 1-12 */
const MONTH_ES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
  setiembre: 9,
};

function normalizeSpanishMonth(raw: string): number | undefined {
  const k = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return MONTH_ES[k];
}

function normalizeMoneyToken(raw: string): number | null {
  let s = raw.replace(/\$/g, "").replace(/\s/g, "").trim();
  // Superíndices / ruido OCR pegado al monto
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, "");
  if (!s) return null;

  // 1.234,56 (AR) — antes que el caso “miles con punto” se confunda con decimales
  if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  // 1,234.56 (US)
  if (/^\d{1,3}(,\d{3})*\.\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(/,/g, ""));
  }
  // 1234,56 o 1234.56 (solo decimales cortos)
  if (/^\d+[.,]\d{1,2}$/.test(s)) {
    const norm = s.includes(",") && s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
    const n = parseFloat(norm);
    return Number.isFinite(n) ? n : null;
  }
  // AR: miles con punto(s); basura al final (p. ej. 13.00000 por superíndices OCR)
  if (!s.includes(",") && /^\d{1,3}(?:\.\d{3})+/.test(s)) {
    const m = s.match(/^(\d{1,3}(?:\.\d{3})+)/);
    if (m) {
      const n = parseInt(m[1]!.replace(/\./g, ""), 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  // Entero con separador miles (exacto)
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    return parseFloat(s.replace(/\./g, ""));
  }
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractAmounts(text: string): number[] {
  const amounts: number[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    // Priorizar líneas con Total / Monto / Importe / Pagaste (Mercado Pago)
    if (/\b(total|monto|importe|pagado|pagar|pagaste|ars)\b/i.test(line)) {
      const sub = line.match(/(\$?\s*[\d.,⁰¹²³⁴⁵⁶⁷⁸⁹]+)/gi) ?? [];
      for (const g of sub) {
        const n = normalizeMoneyToken(g);
        if (n != null && n > 0 && n < 1e9) amounts.push(n);
      }
    }
  }
  // Línea que es casi solo el monto (típico MP: monto grande centrado)
  for (const line of lines) {
    const t = line.trim();
    if (/^\$\s*[\d.,⁰¹²³⁴⁵⁶⁷⁸⁹\s]+$/.test(t) && t.length <= 32) {
      const n = normalizeMoneyToken(t);
      if (n != null && n > 0 && n < 1e9) amounts.push(n);
    }
  }
  for (const line of lines) {
    const sub =
      line.match(/(\$?\s*[\d]{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\$?\s*[\d]+(?:[.,]\d{1,2})?)/g) ?? [];
    for (const g of sub) {
      const n = normalizeMoneyToken(g);
      if (n != null && n > 0 && n < 1e9) amounts.push(n);
    }
  }
  return amounts;
}

function pickAmount(amounts: number[]): number | null {
  if (amounts.length === 0) return null;
  const positive = amounts.filter((a) => a > 0);
  if (positive.length === 0) return null;
  // En comprobantes suele predominar el monto final (a menudo el mayor razonable)
  const sorted = Array.from(new Set(positive)).sort((a, b) => b - a);
  return sorted[0] ?? null;
}

/** "Sábado, 4 de abril de 2026, 17:43" / "4 de abril de 2026" */
function extractDateSpanish(text: string): string | null {
  const es = text.match(
    /(?:[a-záéíóúñ]+,?\s+)?(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(20\d{2})/i,
  );
  if (!es) return null;
  const day = parseInt(es[1]!, 10);
  const month = normalizeSpanishMonth(es[2]!);
  const year = parseInt(es[3]!, 10);
  if (month == null || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractDate(text: string): string | null {
  const es = extractDateSpanish(text);
  if (es) return es;
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const dmy = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2}|\d{2})\b/);
  if (dmy) {
    const d = parseInt(dmy[1]!, 10);
    const mo = parseInt(dmy[2]!, 10);
    let y = parseInt(dmy[3]!, 10);
    if (y < 100) y += 2000;
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return null;
}

/** Mercado Pago: nombre bajo la etiqueta "Para". */
function extractMerchantFromPara(lines: string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!/^para\s*:?\s*$/i.test(line)) continue;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const t = lines[j]!.trim();
      if (!t) continue;
      if (/^de$/i.test(t)) break;
      if (/^mercado\s*pago$/i.test(t)) continue;
      const digitsOnly = t.replace(/\D/g, "");
      if (digitsOnly.length >= 10 && digitsOnly.length <= 13 && /^\d[\d\s.\-]+$/.test(t)) continue;
      if (SKIP_LINE.test(t)) continue;
      if (t.length < 2 || t.length > 120) continue;
      if (/^[\d\s$.,\-:/]+$/.test(t)) continue;
      return t;
    }
  }
  return null;
}

function extractMerchant(lines: string[]): string | null {
  const candidates: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.length < 3 || t.length > 120) continue;
    if (SKIP_LINE.test(t)) continue;
    if (/^[\d\s$.,\-:/]+$/.test(t)) continue;
    if (/^\d+[.,]\d+$/.test(t)) continue;
    candidates.push(t);
  }
  // Primera línea con aspecto de nombre de comercio (no demasiado larga)
  const scored = candidates
    .filter((c) => c.split(/\s+/).length >= 1)
    .sort((a, b) => b.length - a.length);
  return scored[0] ?? null;
}

export function parseReceiptOcrText(raw: string): ParsedReceipt {
  const rawText = raw.replace(/\u00a0/g, " ").trim();
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const amounts = extractAmounts(rawText);
  const amount = pickAmount(amounts);
  const transactionDate = extractDate(rawText);
  const merchant = extractMerchantFromPara(lines) ?? extractMerchant(lines);
  const description =
    merchant != null
      ? `Pago QR / captura · ${merchant}`
      : "Importado desde captura (OCR)";

  let confidence: ParsedReceipt["confidence"] = "low";
  if (amount != null && transactionDate) confidence = "high";
  else if (amount != null || transactionDate) confidence = "medium";

  return {
    amount,
    transactionDate,
    merchant,
    description,
    confidence,
    rawText,
  };
}
