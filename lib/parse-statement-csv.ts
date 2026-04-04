export type ParsedStatementRow = {
  transactionDate: Date;
  amount: number;
  description: string;
  merchant: string;
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/^\uFEFF/, "");
}

function detectDelimiter(line: string): string {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

function splitRow(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === delimiter) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

const DATE_KEYS = ["date", "fecha", "transactiondate", "transaction_date"];
const AMOUNT_KEYS = ["amount", "monto", "importe", "debit", "cargo"];
const DESC_KEYS = ["description", "descripcion", "detalle", "concepto", "memo"];
const MERCHANT_KEYS = ["merchant", "comercio", "establecimiento", "payee"];

function findColumnIndex(headers: string[], keys: string[]): number {
  const norm = headers.map(normalizeHeader);
  for (const k of keys) {
    const i = norm.findIndex((h) => h === k || h.replace(/\s/g, "") === k);
    if (i >= 0) return i;
  }
  return -1;
}

function parseDate(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.test(t) ? new Date(t.slice(0, 10)) : null;
  if (iso && !Number.isNaN(iso.getTime())) return iso;
  const dmy = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function parseAmount(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.abs(n) : null;
}

/**
 * Espera cabecera con columnas reconocibles (fecha + monto + descripción o comercio).
 * Delimitador `,` o `;`.
 */
export function parseStatementCsv(text: string): ParsedStatementRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]!);
  const headers = splitRow(lines[0]!, delimiter).map((h) => normalizeHeader(h.replace(/^"|"$/g, "")));
  const iDate = findColumnIndex(headers, DATE_KEYS);
  const iAmount = findColumnIndex(headers, AMOUNT_KEYS);
  const iDesc = findColumnIndex(headers, DESC_KEYS);
  const iMerch = findColumnIndex(headers, MERCHANT_KEYS);

  if (iDate < 0 || iAmount < 0) return [];

  const rows: ParsedStatementRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = splitRow(lines[li]!, delimiter).map((c) => c.replace(/^"|"$/g, ""));
    const dateStr = cells[iDate] ?? "";
    const amountStr = cells[iAmount] ?? "";
    const description = iDesc >= 0 ? (cells[iDesc] ?? "").trim() : "";
    const merchant = iMerch >= 0 ? (cells[iMerch] ?? "").trim() : "";

    const transactionDate = parseDate(dateStr);
    const amount = parseAmount(amountStr);
    if (!transactionDate || amount == null || amount <= 0) continue;

    rows.push({
      transactionDate,
      amount,
      description: description || merchant || "Imported",
      merchant: merchant || description || "",
    });
  }

  return rows;
}
