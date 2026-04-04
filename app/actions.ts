"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMonthFinancials, upsertBudgetConfig } from "@/services/budgetService";
import { syncAlertsForMonth } from "@/services/alertService";
import { parseStatementCsv } from "@/lib/parse-statement-csv";
import { importStatementRows } from "@/services/statementImportService";

async function refreshAlerts(userId: string, month: number, year: number) {
  const { percentConsumed, config } = await getMonthFinancials(userId, month, year);
  await syncAlertsForMonth(userId, month, year, percentConsumed, config.id);
}

const expenseBase = z.object({
  userId: z.string().min(1),
  transactionDate: z.string().min(1),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  merchant: z.string().optional(),
  installments: z.coerce.number().int().min(1).default(1),
  notes: z.string().optional(),
  cardId: z.string().min(1),
  categoryId: z.string().min(1),
  postedMonth: z.coerce.number().min(1).max(12),
  postedYear: z.coerce.number(),
});

export async function createExpenseAction(input: z.infer<typeof expenseBase>) {
  const data = expenseBase.parse(input);
  const card = await prisma.creditCard.findFirst({
    where: { id: data.cardId, userId: data.userId },
  });
  if (!card) throw new Error("Invalid card for user");
  const transactionDate = new Date(data.transactionDate);
  await prisma.expense.create({
    data: {
      transactionDate,
      postedMonth: data.postedMonth,
      postedYear: data.postedYear,
      amount: data.amount,
      description: data.description,
      merchant: data.merchant,
      installments: data.installments,
      notes: data.notes,
      sourceType: "manual",
      reconciliationStatus: "pending",
      cardId: data.cardId,
      categoryId: data.categoryId,
    },
  });
  await refreshAlerts(data.userId, data.postedMonth, data.postedYear);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/reports");
}

const expenseUpdate = expenseBase.extend({ id: z.string().min(1) });

export async function updateExpenseAction(input: z.infer<typeof expenseUpdate>) {
  const data = expenseUpdate.parse(input);
  const transactionDate = new Date(data.transactionDate);
  await prisma.expense.update({
    where: { id: data.id },
    data: {
      transactionDate,
      postedMonth: data.postedMonth,
      postedYear: data.postedYear,
      amount: data.amount,
      description: data.description,
      merchant: data.merchant,
      installments: data.installments,
      notes: data.notes,
      cardId: data.cardId,
      categoryId: data.categoryId,
    },
  });
  await refreshAlerts(data.userId, data.postedMonth, data.postedYear);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/reports");
}

export async function deleteExpenseAction(input: { id: string; userId: string; month: number; year: number }) {
  const schema = z.object({
    id: z.string(),
    userId: z.string(),
    month: z.coerce.number(),
    year: z.coerce.number(),
  });
  const data = schema.parse(input);
  await prisma.expense.delete({ where: { id: data.id } });
  await refreshAlerts(data.userId, data.month, data.year);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/reports");
}

const budgetSchema = z.object({
  userId: z.string(),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number(),
  monthlyIncome: z.coerce.number().nonnegative().nullable(),
  allowedPercentage: z.coerce.number().min(0).max(100).nullable(),
  manualCardLimit: z.coerce.number().nonnegative().nullable(),
  thresholds: z
    .array(z.object({ percentage: z.coerce.number(), enabled: z.boolean() }))
    .optional(),
});

export async function saveBudgetAction(input: z.infer<typeof budgetSchema>) {
  const data = budgetSchema.parse(input);
  await upsertBudgetConfig(data.userId, data.month, data.year, {
    monthlyIncome: data.monthlyIncome,
    allowedPercentage: data.allowedPercentage,
    manualCardLimit: data.manualCardLimit,
    thresholds: data.thresholds,
  });
  await refreshAlerts(data.userId, data.month, data.year);
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/reports");
}

const cardSchema = z.object({
  userId: z.string(),
  bank: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  last4: z.string().length(4),
  closingDay: z.coerce.number().min(1).max(31),
  dueDay: z.coerce.number().min(1).max(31),
  active: z.boolean().optional(),
});

export async function createCardAction(input: z.infer<typeof cardSchema>) {
  const data = cardSchema.parse(input);
  await prisma.creditCard.create({
    data: {
      userId: data.userId,
      bank: data.bank,
      name: data.name,
      brand: data.brand,
      last4: data.last4,
      closingDay: data.closingDay,
      dueDay: data.dueDay,
      active: data.active ?? true,
    },
  });
  revalidatePath("/cards");
  revalidatePath("/expenses");
}

const cardUpdate = cardSchema.extend({ id: z.string() });

export async function updateCardAction(input: z.infer<typeof cardUpdate>) {
  const data = cardUpdate.parse(input);
  await prisma.creditCard.update({
    where: { id: data.id },
    data: {
      bank: data.bank,
      name: data.name,
      brand: data.brand,
      last4: data.last4,
      closingDay: data.closingDay,
      dueDay: data.dueDay,
      active: data.active ?? true,
    },
  });
  revalidatePath("/cards");
  revalidatePath("/expenses");
}

export async function deleteCardAction(input: { id: string }) {
  const { id } = z.object({ id: z.string() }).parse(input);
  await prisma.expense.deleteMany({ where: { cardId: id } });
  await prisma.creditCard.delete({ where: { id } });
  revalidatePath("/cards");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function disconnectGoogleCalendarAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  await prisma.user.update({
    where: { id: userId },
    data: { googleRefreshToken: null, googleCalendarEmail: null },
  });
  revalidatePath("/imports");
}

export type ImportStatementResult =
  | { ok: true; expensesCreated: number; paymentDueDate: string }
  | { ok: false; error: string };

export async function importStatementCsvAction(formData: FormData): Promise<ImportStatementResult> {
  try {
    const userId = String(formData.get("userId") ?? "");
    const cardId = String(formData.get("cardId") ?? "");
    const importMonth = Number(formData.get("importMonth"));
    const importYear = Number(formData.get("importYear"));
    const file = formData.get("file");

    if (!userId || !cardId) return { ok: false, error: "Faltan datos del formulario." };
    if (!Number.isFinite(importMonth) || importMonth < 1 || importMonth > 12) {
      return { ok: false, error: "Mes inválido." };
    }
    if (!Number.isFinite(importYear) || importYear < 2000) {
      return { ok: false, error: "Año inválido." };
    }

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Seleccioná un archivo CSV." };
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      return { ok: false, error: "El archivo es demasiado grande (máx. 2 MB)." };
    }

    const text = await file.text();
    const rows = parseStatementCsv(text);
    if (rows.length === 0) {
      return {
        ok: false,
        error:
          "No se encontraron filas válidas. Cabeceras: fecha (date/fecha), monto (amount/monto), descripción o comercio. Separador , o ;.",
      };
    }

    const { expensesCreated, paymentDueDate } = await importStatementRows({
      userId,
      cardId,
      importMonth,
      importYear,
      fileName: file.name,
      rows,
    });

    await refreshAlerts(userId, importMonth, importYear);
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/reports");
    revalidatePath("/imports");

    return {
      ok: true,
      expensesCreated,
      paymentDueDate: paymentDueDate.toISOString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al importar.";
    return { ok: false, error: msg };
  }
}
