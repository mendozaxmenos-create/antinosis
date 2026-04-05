import type { ParsedStatementRow } from "@/lib/parse-statement-csv";
import { parseStatementCsv } from "@/lib/parse-statement-csv";
import {
  looksLikeBancoNacionMcStatementText,
  parseBancoNacionMcStatementText,
} from "@/lib/parse-banco-nacion-mc-statement";
import { looksLikeBbvaStatementText, parseBbvaStatementText } from "@/lib/parse-bbva-statement";
import { parseBrubankStatementText } from "@/lib/parse-brubank-statement";
import {
  looksLikeHipotecarioStatementText,
  parseHipotecarioStatementText,
} from "@/lib/parse-hipotecario-statement";

/** CSV genérico; si no hay filas, PDF/texto de banco (BBVA, Nación MC, Hipotecario, Brubank, …). */
export function parseStatementFromText(text: string): ParsedStatementRow[] {
  const csv = parseStatementCsv(text);
  if (csv.length > 0) return csv;
  if (looksLikeBbvaStatementText(text)) return parseBbvaStatementText(text);
  if (looksLikeBancoNacionMcStatementText(text)) return parseBancoNacionMcStatementText(text);
  if (looksLikeHipotecarioStatementText(text)) return parseHipotecarioStatementText(text);
  return parseBrubankStatementText(text);
}
