import type { ParsedStatementRow } from "@/lib/parse-statement-csv";
import { parseAmountAr } from "@/lib/parse-amount-ar";
import { parseDdMmYyDot } from "@/lib/parse-dd-mm-yy-dot";

/**
 * PDF Visa con fechas DD.MM.AA y columnas FECHA COMPROBANTE · DETALLE · PESOS · DOLARES.
 * Cubre al menos: Banco Hipotecario, Banco Nación Visa / Visa Signature (p. ej. CRE-PPL*.pdf).
 * Línea típica: 02.03.26  829429K  MERPAGO*CAYOCASTRO  18.157,00
 * Con cuotas: 20.03.26  284763*  MERPAGO*FGSTORE  Cuota 01/03  11.819,42
 */
const LINE_RE =
  /^(\d{2}\.\d{2}\.\d{2})\s+(.+?)\s+([\d]{1,3}(?:\.\d{3})*,\d{2}-?)(?:\s+([\d]{1,3}(?:\.\d{3})*,\d{2}-?))?\s*$/;

function isCreditAmount(raw: string): boolean {
  return raw.trim().endsWith("-");
}

function shouldSkipHipotecarioDetail(desc: string): boolean {
  const d = desc.trim().toLowerCase();
  if (!d) return true;
  if (/^saldo\s+anterior/i.test(d)) return true;
  if (/^su pago/i.test(d)) return true;
  if (/bonif/i.test(d)) return true;
  return false;
}

export function looksLikeHipotecarioStatementText(text: string): boolean {
  const t = text.toLowerCase();
  /** Mismo layout en varios bancos; la URL es la marca más fiable cuando aparece. */
  if (t.includes("hipotecario.com.ar")) return true;
  if (
    /fecha\s+comprobante/i.test(text) &&
    /detalle\s+de\s+transacci/i.test(text) &&
    /\bpesos\b/i.test(text) &&
    /\bd[oó]lares\b/i.test(text) &&
    /\d{2}\.\d{2}\.\d{2}\s+/.test(text)
  ) {
    return true;
  }
  return false;
}

export function parseHipotecarioStatementText(text: string): ParsedStatementRow[] {
  if (!looksLikeHipotecarioStatementText(text)) return [];

  const rows: ParsedStatementRow[] = [];
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/\u00a0/g, " ").trim();
    if (!line || /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) continue;
    if (/^fecha\s+comprobante/i.test(line)) continue;
    if (/^pagina:/i.test(line)) continue;

    const m = line.match(LINE_RE);
    if (!m) continue;

    const transactionDate = parseDdMmYyDot(m[1]!);
    if (!transactionDate) continue;

    const description = m[2]!.replace(/\s+/g, " ").trim();
    const pesosRaw = m[3]!.trim();
    const usdRaw = m[4]?.trim();

    if (shouldSkipHipotecarioDetail(description)) continue;
    if (isCreditAmount(pesosRaw)) continue;

    const pesos = parseAmountAr(pesosRaw.replace(/-$/, ""));
    const usd = usdRaw ? parseAmountAr(usdRaw.replace(/-$/, "")) : null;

    if (pesos != null && pesos > 0) {
      rows.push({
        transactionDate,
        amount: pesos,
        description: description || "Imported",
        merchant: description || "",
      });
      continue;
    }

    if ((pesos == null || pesos === 0) && usd != null && usd > 0 && !isCreditAmount(usdRaw!)) {
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
