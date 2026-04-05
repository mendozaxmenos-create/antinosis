import { prisma } from "@/lib/prisma";
import { categorizeFromText } from "@/lib/statement-categorize";
import { computePaymentDueDate } from "@/lib/payment-due-date";
import type { ParsedStatementRow } from "@/lib/parse-statement-csv";
import { createPaymentDueCalendarEvent } from "@/lib/google-calendar";
import { deliverExternalAlerts } from "@/lib/notify-external";
import { getUsdArsRateBcraOfficial } from "@/lib/bcra-usd-ars-rate";

type ResolvedImportRow = {
  row: ParsedStatementRow;
  amountArs: number;
  originalCurrency: string | null;
  originalAmount: number | null;
  notes: string;
};

async function resolveImportRows(fileName: string, rows: ParsedStatementRow[]): Promise<ResolvedImportRow[]> {
  const cache = new Map<string, { rate: number; rateDate: string }>();
  const out: ResolvedImportRow[] = [];

  for (const row of rows) {
    const baseNotes = `Importado desde ${fileName}`;
    if (row.currency === "USD") {
      const key = row.transactionDate.toISOString().slice(0, 10);
      let fx = cache.get(key);
      if (!fx) {
        fx = await getUsdArsRateBcraOfficial(row.transactionDate);
        cache.set(key, fx);
      }
      const amountArs = Math.round(row.amount * fx.rate * 100) / 100;
      out.push({
        row,
        amountArs,
        originalCurrency: "USD",
        originalAmount: row.amount,
        notes: `${baseNotes} · USD ${row.amount.toFixed(2)} × ${fx.rate.toFixed(2)} ARS/USD (BCRA ${fx.rateDate})`,
      });
    } else {
      out.push({
        row,
        amountArs: row.amount,
        originalCurrency: null,
        originalAmount: null,
        notes: baseNotes,
      });
    }
  }
  return out;
}

export async function importStatementRows(input: {
  userId: string;
  cardId: string;
  importMonth: number;
  importYear: number;
  fileName: string;
  rows: ParsedStatementRow[];
}) {
  const card = await prisma.creditCard.findFirst({
    where: { id: input.cardId, userId: input.userId, active: true },
  });
  if (!card) throw new Error("Tarjeta inválida");

  const categories = await prisma.category.findMany({ where: { active: true } });
  const byName = new Map(categories.map((c) => [c.name, c.id]));

  const paymentDueDate = computePaymentDueDate(input.importYear, input.importMonth, card.dueDay);

  const resolved = await resolveImportRows(input.fileName, input.rows);

  const result = await prisma.$transaction(async (tx) => {
    const stmt = await tx.statementImport.create({
      data: {
        userId: input.userId,
        cardId: input.cardId,
        bank: card.bank,
        fileName: input.fileName,
        importMonth: input.importMonth,
        importYear: input.importYear,
        status: "completed",
        paymentDueDate,
        rowCount: input.rows.length,
      },
    });

    let created = 0;
    for (const item of resolved) {
      const { row } = item;
      const catName = categorizeFromText(row.description, row.merchant);
      const categoryId = byName.get(catName) ?? byName.get("Other");
      if (!categoryId) continue;

      const td = row.transactionDate;
      const postedMonth = td.getMonth() + 1;
      const postedYear = td.getFullYear();

      await tx.expense.create({
        data: {
          transactionDate: row.transactionDate,
          postedMonth,
          postedYear,
          amount: item.amountArs,
          originalCurrency: item.originalCurrency,
          originalAmount: item.originalAmount,
          description: row.description,
          merchant: row.merchant,
          installments: 1,
          notes: item.notes,
          sourceType: "imported_file",
          reconciliationStatus: "pending",
          statementImportId: stmt.id,
          cardId: input.cardId,
          categoryId,
        },
      });
      created += 1;
    }

    const dueMonth = paymentDueDate.getMonth() + 1;
    const dueYear = paymentDueDate.getFullYear();

    const existingDue = await tx.alertEvent.findFirst({
      where: { statementImportId: stmt.id, alertKind: "payment_due" },
    });
    let createdPaymentDueAlert = false;
    if (!existingDue) {
      await tx.alertEvent.create({
        data: {
          userId: input.userId,
          month: dueMonth,
          year: dueYear,
          alertKind: "payment_due",
          thresholdPercentage: null,
          message: `Vencimiento de pago (${card.bank} ·••• ${card.last4}): ${formatDueMessage(paymentDueDate)}`,
          dueDate: paymentDueDate,
          statementImportId: stmt.id,
        },
      });
      createdPaymentDueAlert = true;
    }

    return {
      statementImport: stmt,
      expensesCreated: created,
      paymentDueDate,
      createdPaymentDueAlert,
    };
  });

  if (result.createdPaymentDueAlert) {
    const dueMsg = `Vencimiento de pago (${card.bank} ·••• ${card.last4}): ${formatDueMessage(result.paymentDueDate)}`;
    await deliverExternalAlerts(input.userId, [dueMsg]);
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { googleRefreshToken: true },
  });
  if (user?.googleRefreshToken) {
    try {
      const eventId = await createPaymentDueCalendarEvent({
        refreshToken: user.googleRefreshToken,
        summary: `Vencimiento tarjeta ${card.bank} ·••• ${card.last4}`,
        description: `Resumen ${input.fileName} (${input.importMonth}/${input.importYear}). Importado desde CardSpend.`,
        dueDate: result.paymentDueDate,
      });
      if (eventId) {
        await prisma.statementImport.update({
          where: { id: result.statementImport.id },
          data: { googleCalendarEventId: eventId },
        });
      }
    } catch (e) {
      console.error("[statementImport] Google Calendar", e);
    }
  }

  return result;
}

function formatDueMessage(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}
