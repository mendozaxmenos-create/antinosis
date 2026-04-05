import type { ParsedStatementRow } from "@/lib/parse-statement-csv";
import { parseAmountAr } from "@/lib/parse-amount-ar";
import { parseDdMmmYy } from "@/lib/parse-dd-mmm-yy";

function shouldSkipBbvaDescription(desc: string): boolean {
  const d = desc.trim().toLowerCase();
  if (!d) return true;
  if (/^total\s+consumos\b/i.test(d)) return true;
  if (/^su pago\b/i.test(d)) return true;
  if (/^saldo\b/i.test(d)) return true;
  if (/^detalle\b/i.test(d)) return true;
  if (/^consumos\s+(de\s+)?/i.test(d)) return true;
  return false;
}

/**
 * Línea de consumo: DD-Mmm-YY ... NRO_CUPÓN(6) PESOS [DÓLARES]
 * Ej: 21-Feb-26 MERPAGO*COTO 771562 20.526,17
 */
const LINE_RE =
  /^(\d{1,2}-[A-Za-z]{3}-\d{2})\s+(.+?)\s+(\d{6})\s+(-?[\d.,]+)(?:\s+(-?[\d.,]+))?\s*$/;

export function looksLikeBbvaStatementText(text: string): boolean {
  const t = text.toLowerCase();
  if (t.includes("banco bbva argentina")) return true;
  if (t.includes("bbva argentina") && t.includes("nro. cupón")) return true;
  return /fecha\s+descripci[oó]n\s+nro\.\s+cup[oó]n\s+pesos\s+d[oó]lares/i.test(text);
}

export function parseBbvaStatementText(text: string): ParsedStatementRow[] {
  if (!looksLikeBbvaStatementText(text)) return [];

  const rows: ParsedStatementRow[] = [];
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/\u00a0/g, " ").trim();
    if (!line || /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) continue;
    if (/^fecha\s+descripci/i.test(line)) continue;

    const m = line.match(LINE_RE);
    if (!m) continue;

    const transactionDate = parseDdMmmYy(m[1]!);
    if (!transactionDate) continue;

    const description = m[2]!.trim();
    const pesosStr = m[4]!.trim();
    const usdStr = m[5]?.trim();

    if (shouldSkipBbvaDescription(description)) continue;

    const pesos = parseAmountAr(pesosStr);
    const usd = usdStr ? parseAmountAr(usdStr) : null;

    if (pesos != null && pesos > 0) {
      rows.push({
        transactionDate,
        amount: pesos,
        description: description || "Imported",
        merchant: description || "",
      });
      continue;
    }

    if (usd != null && usd > 0) {
      rows.push({
        transactionDate,
        amount: usd,
        description: description || "Imported",
        merchant: description || "",
        currency: "USD",
      });
    }
  }

  return rows;
}
