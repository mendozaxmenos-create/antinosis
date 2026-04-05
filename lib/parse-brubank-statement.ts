import type { ParsedStatementRow } from "@/lib/parse-statement-csv";
import { parseAmountAr } from "@/lib/parse-amount-ar";

function parseIsoDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return null;
  const d = new Date(s.trim() + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

function shouldSkipBrubankDescription(desc: string): boolean {
  const d = desc.trim().toLowerCase();
  if (!d) return true;
  if (/^pago del plan de la tarjeta|^pago de la tarjeta/i.test(d)) return true;
  if (/^pago\s+m[ií]nimo/i.test(d)) return true;
  if (/^total$/i.test(d)) return true;
  if (/^iva(\s+digital|\s+)?/i.test(d) && d.length < 48) return true;
  return false;
}

function tryParseBrubankLine(line: string): ParsedStatementRow | null {
  const trimmed = line.replace(/\u00a0/g, " ").trim();
  if (!trimmed) return null;

  let dateStr: string;
  let ref: string;
  let description: string;
  let amountStr: string;

  const tab = trimmed.split(/\t/).map((x) => x.trim()).filter(Boolean);
  if (tab.length >= 4 && /^\d{4}-\d{2}-\d{2}$/.test(tab[0]!) && /^\d{8,12}$/.test(tab[1]!)) {
    dateStr = tab[0]!;
    ref = tab[1]!;
    amountStr = tab[tab.length - 1]!;
    description = tab.slice(2, -1).join(" ").trim();
  } else {
    const m = trimmed.match(
      /^(\d{4}-\d{2}-\d{2})\s+(\d{8,12})\s+(.+?)\s+(U\$S\s*[\d.,]+|\$\s*[\d.,]+)\s*$/i,
    );
    if (!m) return null;
    dateStr = m[1]!;
    ref = m[2]!;
    description = m[3]!.trim();
    amountStr = m[4]!.trim();
  }

  const transactionDate = parseIsoDate(dateStr);
  if (!transactionDate) return null;
  if (!/^\d{8,12}$/.test(ref)) return null;
  if (shouldSkipBrubankDescription(description)) return null;

  const amount = parseAmountAr(amountStr);
  if (amount == null || amount <= 0) return null;

  const isUsd = /^U\$S/i.test(amountStr.trim());

  return {
    transactionDate,
    amount,
    description: description || "Imported",
    merchant: description || "",
    currency: isUsd ? "USD" : "ARS",
  };
}

export function looksLikeBrubankStatementText(text: string): boolean {
  const t = text.toLowerCase();
  if (t.includes("brubank")) return true;
  return /fecha\s*#?\s*ref\s+descripci/i.test(text);
}

/**
 * Texto extraído del PDF de resumen Brubank (tablas Fecha / #Ref / Descripción / Dólares / Pesos).
 */
export function parseBrubankStatementText(text: string): ParsedStatementRow[] {
  if (!looksLikeBrubankStatementText(text)) return [];

  const rows: ParsedStatementRow[] = [];
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) continue;
    const row = tryParseBrubankLine(line);
    if (row) rows.push(row);
  }

  return rows;
}
