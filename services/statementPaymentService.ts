import { endOfMonth, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { STATEMENT_IMPORT_EXPENSE_SOURCE_TYPES } from "@/lib/statement-import-expense-sources";

const IMPORT_SOURCES = STATEMENT_IMPORT_EXPENSE_SOURCE_TYPES;

/**
 * Suma los importes de los resúmenes importados cuyo vencimiento de pago cae en el mes calendario dado.
 * Se agrupa por archivo de resumen (`statementImportId`), no por mes de imputación contable.
 */
export async function sumStatementPaymentsDueInMonth(
  userId: string,
  month: number,
  year: number,
): Promise<number> {
  const ref = new Date(year, month - 1, 1);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);

  const imports = await prisma.statementImport.findMany({
    where: {
      userId,
      paymentDueDate: {
        not: null,
        gte: start,
        lte: end,
      },
    },
    select: { id: true },
  });

  const ids = imports.map((i) => i.id);
  if (ids.length === 0) return 0;

  const agg = await prisma.expense.aggregate({
    where: {
      statementImportId: { in: ids },
      card: { userId },
      sourceType: { in: [...IMPORT_SOURCES] },
    },
    _sum: { amount: true },
  });

  return agg._sum.amount ?? 0;
}

/**
 * Para cada mes calendario (clave `year-month`), total a pagar por resúmenes con vencimiento en ese mes.
 */
export async function mapStatementPaymentsDueByCalendarMonth(
  userId: string,
): Promise<Map<string, number>> {
  const imports = await prisma.statementImport.findMany({
    where: { userId, paymentDueDate: { not: null } },
    select: { id: true, paymentDueDate: true },
  });

  if (imports.length === 0) return new Map();

  const sums = await prisma.expense.groupBy({
    by: ["statementImportId"],
    where: {
      card: { userId },
      sourceType: { in: [...IMPORT_SOURCES] },
      statementImportId: { not: null },
    },
    _sum: { amount: true },
  });
  const byImport = new Map(sums.map((s) => [s.statementImportId!, s._sum.amount ?? 0]));

  const result = new Map<string, number>();
  for (const imp of imports) {
    if (!imp.paymentDueDate) continue;
    const d = imp.paymentDueDate;
    const dueKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const amt = byImport.get(imp.id) ?? 0;
    result.set(dueKey, (result.get(dueKey) ?? 0) + amt);
  }

  return result;
}

export type StatementPaymentsBreakdown = {
  totalArsEquivalent: number;
  subtotalArsNative: number;
  subtotalUsdOriginal: number;
  subtotalUsdAsArs: number;
  byCard: {
    cardId: string;
    bank: string;
    last4: string;
    totalArs: number;
    arsNative: number;
    usdOriginal: number;
    usdAsArs: number;
  }[];
};

/**
 * Desglose de lo que suma al "total a pagar" por resúmenes con vencimiento en el mes (ARS + USD convertido).
 */
export async function getStatementPaymentsBreakdownForMonth(
  userId: string,
  month: number,
  year: number,
): Promise<StatementPaymentsBreakdown> {
  const ref = new Date(year, month - 1, 1);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);

  const imports = await prisma.statementImport.findMany({
    where: {
      userId,
      paymentDueDate: {
        not: null,
        gte: start,
        lte: end,
      },
    },
    include: { card: true },
  });

  const ids = imports.map((i) => i.id);
  if (ids.length === 0) {
    return {
      totalArsEquivalent: 0,
      subtotalArsNative: 0,
      subtotalUsdOriginal: 0,
      subtotalUsdAsArs: 0,
      byCard: [],
    };
  }

  const expenses = await prisma.expense.findMany({
    where: {
      statementImportId: { in: ids },
      card: { userId },
    },
    include: { card: true },
  });

  let subtotalArsNative = 0;
  let subtotalUsdOriginal = 0;
  let subtotalUsdAsArs = 0;
  const byCardMap = new Map<
    string,
    {
      cardId: string;
      bank: string;
      last4: string;
      totalArs: number;
      arsNative: number;
      usdOriginal: number;
      usdAsArs: number;
    }
  >();

  for (const e of expenses) {
    const isUsd = e.originalCurrency === "USD";
    const arsPart = e.amount;
    if (isUsd) {
      subtotalUsdAsArs += arsPart;
      subtotalUsdOriginal += e.originalAmount ?? 0;
    } else {
      subtotalArsNative += arsPart;
    }

    const cid = e.cardId;
    if (!byCardMap.has(cid)) {
      byCardMap.set(cid, {
        cardId: cid,
        bank: e.card.bank,
        last4: e.card.last4,
        totalArs: 0,
        arsNative: 0,
        usdOriginal: 0,
        usdAsArs: 0,
      });
    }
    const bc = byCardMap.get(cid)!;
    bc.totalArs += arsPart;
    if (isUsd) {
      bc.usdOriginal += e.originalAmount ?? 0;
      bc.usdAsArs += arsPart;
    } else {
      bc.arsNative += arsPart;
    }
  }

  const totalArsEquivalent = subtotalArsNative + subtotalUsdAsArs;

  return {
    totalArsEquivalent,
    subtotalArsNative,
    subtotalUsdOriginal,
    subtotalUsdAsArs,
    byCard: Array.from(byCardMap.values()),
  };
}
