import type { ParsedStatementRow } from "@/lib/parse-statement-csv";
import { parseAmountAr } from "@/lib/parse-amount-ar";
import { parseDdMmmYy } from "@/lib/parse-dd-mmm-yy";

/**
 * Banco Nación — Mastercard / Nativa: "DETALLE DEL MES … NRO CUPON PESOS DOLAR"
 * Con cuotas: `07-Ene-26 PROLUBE CORREDOR 03/06 02668 150000,00`
 * Una cuota: `02-Mar-26 WWW.NOSIS.COM 01507 17747,00`
 */
const LINE_WITH_CUOTA =
  /^(\d{1,2}-[A-Za-z]{3}-\d{2})\s+(.+?)\s+(\d{1,2}\/\d{1,2})\s+(\d{4,6})\s+(-?[\d.,]+)\s*$/;
const LINE_SIMPLE =
  /^(\d{1,2}-[A-Za-z]{3}-\d{2})\s+(.+?)\s+(\d{4,6})\s+(-?[\d.,]+)\s*$/;

function shouldSkipNacionDescription(desc: string): boolean {
  const d = desc.trim().toLowerCase();
  if (!d) return true;
  if (/^su pago\b/i.test(d)) return true;
  if (/^total\s+titular\b/i.test(d)) return true;
  if (/^subtotal\b/i.test(d)) return true;
  if (/^total\b/i.test(d)) return true;
  return false;
}

export function looksLikeBancoNacionMcStatementText(text: string): boolean {
  const t = text.toLowerCase();
  if (t.includes("detalle del mes") && /cup[oó]n/i.test(t) && t.includes("pesos")) return true;
  if (t.includes("mastercard") && t.includes("estado de cuenta al")) return true;
  if (t.includes("banco naci") && t.includes("mastercard") && t.includes("vencimiento actual")) return true;
  return false;
}

export function parseBancoNacionMcStatementText(text: string): ParsedStatementRow[] {
  if (!looksLikeBancoNacionMcStatementText(text)) return [];

  const rows: ParsedStatementRow[] = [];
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/\u00a0/g, " ").replace(/\t+/g, " ").trim();
    if (!line || /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) continue;

    let m = line.match(LINE_WITH_CUOTA);
    let description: string;
    let pesosStr: string;
    let extraCuota: string | undefined;

    if (m) {
      description = m[2]!.trim();
      extraCuota = m[3]!.trim();
      pesosStr = m[5]!.trim();
    } else {
      m = line.match(LINE_SIMPLE);
      if (!m) continue;
      description = m[2]!.trim();
      pesosStr = m[4]!.trim();
    }

    const transactionDate = parseDdMmmYy(m[1]!);
    if (!transactionDate) continue;
    if (shouldSkipNacionDescription(description)) continue;

    const pesos = parseAmountAr(pesosStr);
    if (pesos == null || pesos <= 0) continue;

    const label = extraCuota ? `${description} (${extraCuota})` : description;

    rows.push({
      transactionDate,
      amount: pesos,
      description: label || "Imported",
      merchant: description || "",
    });
  }

  return rows;
}
