import { prisma } from "@/lib/prisma";
import type { CreditCard, ReconciliationResult } from "@prisma/client";
import { STATEMENT_IMPORT_EXPENSE_SOURCE_TYPES } from "@/lib/statement-import-expense-sources";

type UserCal = {
  googleRefreshToken: string | null;
  googleCalendarEmail: string | null;
};

type ImportBase = Awaited<
  ReturnType<typeof prisma.statementImport.findMany<{ include: { card: true } }>>
>[number];

export type StatementImportPayableLine = {
  id: string;
  description: string | null;
  merchant: string | null;
  amount: number;
  originalCurrency: string | null;
  originalAmount: number | null;
  transactionDate: Date | string;
};

export type StatementImportListRow = ImportBase & {
  /** Suma en ARS (pesos nativos + equivalente ARS de consumos en USD). Igual que el panel “total a pagar”. */
  totalPayableArs: number;
  payableArsNative: number;
  payableUsdOriginal: number;
  payableUsdAsArs: number;
  payableLines: StatementImportPayableLine[];
};

export type ImportsPageData =
  | {
      ok: true;
      user: UserCal;
      imports: StatementImportListRow[];
      reconciliations: ReconciliationResult[];
      cards: CreditCard[];
      loadWarnings: string[];
    }
  | { ok: false; message: string };

function warn(label: string, reason: unknown): string {
  console.error(`[imports] ${label}`, reason);
  return label;
}

/**
 * Carga datos de /imports sin tirar 500: si una consulta falla (esquema viejo en prod),
 * se devuelve array vacío y un aviso para `loadWarnings`.
 */
export async function loadImportsPageData(userId: string): Promise<ImportsPageData> {
  const loadWarnings: string[] = [];

  const settled = await Promise.allSettled([
    prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true, googleCalendarEmail: true },
    }),
    prisma.statementImport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { card: true },
    }),
    prisma.reconciliationResult.findMany({
      where: { userId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
    }),
    prisma.creditCard.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const u = settled[0];
  if (u.status === "rejected") {
    return {
      ok: false,
      message: "No se pudo leer tu perfil. Revisá la conexión a la base o las variables en el servidor.",
    };
  }
  if (u.value == null) {
    return { ok: false, message: "Sesión inválida." };
  }

  const imports =
    settled[1].status === "fulfilled"
      ? settled[1].value
      : (loadWarnings.push(warn("Historial de importaciones no disponible.", settled[1].reason)), []);

  const reconciliations =
    settled[2].status === "fulfilled"
      ? settled[2].value
      : (loadWarnings.push(warn("Conciliación no disponible.", settled[2].reason)), []);

  const cards =
    settled[3].status === "fulfilled"
      ? settled[3].value
      : (loadWarnings.push(warn("Tarjetas no disponibles.", settled[3].reason)), []);

  let importsWithTotals: StatementImportListRow[] = imports.map((row) => ({
    ...row,
    totalPayableArs: 0,
    payableArsNative: 0,
    payableUsdOriginal: 0,
    payableUsdAsArs: 0,
    payableLines: [],
  }));
  const importIds = imports.map((i) => i.id);
  if (importIds.length > 0) {
    try {
      const payableExpenses = await prisma.expense.findMany({
        where: {
          statementImportId: { in: importIds },
          card: { userId },
          sourceType: { in: [...STATEMENT_IMPORT_EXPENSE_SOURCE_TYPES] },
        },
        select: {
          id: true,
          statementImportId: true,
          description: true,
          merchant: true,
          amount: true,
          originalCurrency: true,
          originalAmount: true,
          transactionDate: true,
        },
        orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      });

      const linesByImport = new Map<string, StatementImportPayableLine[]>();
      const aggByImport = new Map<
        string,
        { total: number; arsNative: number; usdOrig: number; usdAsArs: number }
      >();

      for (const e of payableExpenses) {
        const sid = e.statementImportId!;
        if (!linesByImport.has(sid)) {
          linesByImport.set(sid, []);
          aggByImport.set(sid, { total: 0, arsNative: 0, usdOrig: 0, usdAsArs: 0 });
        }
        linesByImport.get(sid)!.push({
          id: e.id,
          description: e.description,
          merchant: e.merchant,
          amount: e.amount,
          originalCurrency: e.originalCurrency,
          originalAmount: e.originalAmount,
          transactionDate: e.transactionDate,
        });
        const agg = aggByImport.get(sid)!;
        const isUsd = e.originalCurrency === "USD";
        agg.total += e.amount;
        if (isUsd) {
          agg.usdAsArs += e.amount;
          agg.usdOrig += e.originalAmount ?? 0;
        } else {
          agg.arsNative += e.amount;
        }
      }

      importsWithTotals = imports.map((row) => {
        const agg = aggByImport.get(row.id);
        const lines = linesByImport.get(row.id) ?? [];
        return {
          ...row,
          totalPayableArs: agg?.total ?? 0,
          payableArsNative: agg?.arsNative ?? 0,
          payableUsdOriginal: agg?.usdOrig ?? 0,
          payableUsdAsArs: agg?.usdAsArs ?? 0,
          payableLines: lines,
        };
      });
    } catch (e) {
      loadWarnings.push(warn("Totales por importación no disponibles.", e));
    }
  }

  return {
    ok: true,
    user: u.value,
    imports: importsWithTotals,
    reconciliations,
    cards,
    loadWarnings,
  };
}
