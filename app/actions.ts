"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/user";
import { getMonthFinancials, upsertBudgetConfig } from "@/services/budgetService";
import { syncAlertsForMonth } from "@/services/alertService";
import { parseStatementFromText } from "@/lib/parse-statement-import";
import { installPdfJsNodePolyfills } from "@/lib/pdf-node-polyfills";
import { getPdfjsLegacyWorkerSrc } from "@/lib/pdf-worker-path";
import { importManualStatement, importStatementRows } from "@/services/statementImportService";
import { computePaymentDueDate } from "@/lib/payment-due-date";
import { deleteCalendarEvent, updatePaymentDueCalendarEvent } from "@/lib/google-calendar";

/** Import dinámico: evita cargar pdfjs-dist al evaluar este módulo (GET /imports). Polyfills antes de pdf-parse (DOMMatrix en Node). */
async function statementFileToText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type?.toLowerCase() ?? "";
  if (type.includes("pdf") || name.endsWith(".pdf")) {
    installPdfJsNodePolyfills();
    const buf = Buffer.from(await file.arrayBuffer());
    const { PDFParse } = await import("pdf-parse");
    PDFParse.setWorker(getPdfjsLegacyWorkerSrc());
    const parser = new PDFParse({ data: buf });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  return file.text();
}

async function refreshAlerts(userId: string, month: number, year: number) {
  const { percentConsumed, config } = await getMonthFinancials(userId, month, year);
  await syncAlertsForMonth(userId, month, year, percentConsumed, config.id);
}

const firstUserSchema = z.object({ name: z.string().trim().min(1, "Nombre requerido").max(120) });

export async function createFirstUserAction(
  input: z.infer<typeof firstUserSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { name } = firstUserSchema.parse(input);
    const n = await prisma.user.count();
    if (n > 0) {
      return { ok: false, error: "Ya existe un perfil." };
    }
    await prisma.user.create({ data: { name } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: e.errors[0]?.message ?? "Dato inválido" };
    }
    return { ok: false, error: "No se pudo crear el perfil." };
  }
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
});

export async function createExpenseAction(input: z.infer<typeof expenseBase>) {
  const data = expenseBase.parse(input);
  const card = await prisma.creditCard.findFirst({
    where: { id: data.cardId, userId: data.userId },
  });
  if (!card) throw new Error("Invalid card for user");
  const transactionDate = new Date(data.transactionDate);
  const postedMonth = transactionDate.getMonth() + 1;
  const postedYear = transactionDate.getFullYear();
  await prisma.expense.create({
    data: {
      transactionDate,
      postedMonth,
      postedYear,
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
  await refreshAlerts(data.userId, postedMonth, postedYear);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/reports");
}

const expenseUpdate = expenseBase.extend({ id: z.string().min(1) });

export async function updateExpenseAction(input: z.infer<typeof expenseUpdate>) {
  const data = expenseUpdate.parse(input);
  const existing = await prisma.expense.findFirst({
    where: { id: data.id, card: { userId: data.userId } },
  });
  if (!existing) throw new Error("Gasto no encontrado");
  const transactionDate = new Date(data.transactionDate);
  const postedMonth = transactionDate.getMonth() + 1;
  const postedYear = transactionDate.getFullYear();
  await prisma.expense.update({
    where: { id: data.id },
    data: {
      transactionDate,
      postedMonth,
      postedYear,
      amount: data.amount,
      description: data.description,
      merchant: data.merchant,
      installments: data.installments,
      notes: data.notes,
      cardId: data.cardId,
      categoryId: data.categoryId,
    },
  });
  const oldMonth = existing.transactionDate.getMonth() + 1;
  const oldYear = existing.transactionDate.getFullYear();
  if (oldMonth !== postedMonth || oldYear !== postedYear) {
    await refreshAlerts(data.userId, oldMonth, oldYear);
  }
  await refreshAlerts(data.userId, postedMonth, postedYear);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/reports");
}

export async function deleteExpenseAction(input: { id: string; userId: string }) {
  const schema = z.object({
    id: z.string(),
    userId: z.string(),
  });
  const data = schema.parse(input);
  const existing = await prisma.expense.findFirst({
    where: { id: data.id, card: { userId: data.userId } },
  });
  if (!existing) throw new Error("Gasto no encontrado");
  const td = existing.transactionDate;
  const month = td.getMonth() + 1;
  const year = td.getFullYear();
  await prisma.expense.delete({ where: { id: data.id } });
  await refreshAlerts(data.userId, month, year);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/reports");
}

const budgetSchema = z.object({
  userId: z.string(),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number(),
  monthlyIncome: z.coerce.number().nonnegative().nullable(),
  allowedPercentage: z.coerce.number().min(0).max(100).nullable().optional(),
  soledadCashTransfer: z.coerce.number().nonnegative().nullable().optional(),
  savingsPercentage: z.coerce.number().min(0).max(100).nullable().optional(),
  manualCardLimit: z.coerce.number().nonnegative().nullable(),
  thresholds: z
    .array(z.object({ percentage: z.coerce.number(), enabled: z.boolean() }))
    .optional(),
});

export async function saveBudgetAction(input: z.infer<typeof budgetSchema>) {
  const data = budgetSchema.parse(input);
  await upsertBudgetConfig(data.userId, data.month, data.year, {
    monthlyIncome: data.monthlyIncome,
    allowedPercentage: data.allowedPercentage ?? null,
    soledadCashTransfer: data.soledadCashTransfer ?? 0,
    savingsPercentage: data.savingsPercentage ?? null,
    manualCardLimit: data.manualCardLimit,
    thresholds: data.thresholds,
  });
  await refreshAlerts(data.userId, data.month, data.year);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/budget");
  revalidatePath("/reports");
}

const alertChannelSchema = z.object({
  userId: z.string(),
  alertChannel: z.enum(["app", "email", "telegram"]),
  alertEmail: z.string().nullable().optional(),
  telegramChatId: z.string().nullable().optional(),
});

export async function saveAlertChannelAction(
  input: z.infer<typeof alertChannelSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const data = alertChannelSchema.parse(input);
    if (data.alertChannel === "email") {
      const em = data.alertEmail?.trim();
      if (!em) return { ok: false, error: "Indicá un email para recibir alertas." };
      const ok = z.string().email().safeParse(em);
      if (!ok.success) return { ok: false, error: "Email inválido." };
    }
    if (data.alertChannel === "telegram") {
      const id = data.telegramChatId?.trim();
      if (!id) return { ok: false, error: "Indicá el ID de chat de Telegram." };
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: {
        alertChannel: data.alertChannel,
        alertEmail: data.alertChannel === "email" ? data.alertEmail?.trim() ?? null : null,
        telegramChatId: data.alertChannel === "telegram" ? data.telegramChatId?.trim() ?? null : null,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo guardar." };
  }
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
      return { ok: false, error: "Seleccioná un archivo CSV o PDF." };
    }

    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      return { ok: false, error: "El archivo es demasiado grande (máx. 8 MB)." };
    }

    const text = await statementFileToText(file);
    const rows = parseStatementFromText(text);
    if (rows.length === 0) {
      return {
        ok: false,
        error:
          "No se encontraron movimientos. Probá: CSV con columnas fecha y monto (coma o punto y coma), o el PDF del resumen de Brubank tal cual lo descargás de la app.",
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

    try {
      await refreshAlerts(userId, importMonth, importYear);
    } catch (alertErr) {
      console.error("[importStatement] refreshAlerts", alertErr);
    }
    try {
      revalidatePath("/dashboard");
      revalidatePath("/expenses");
      revalidatePath("/reports");
      revalidatePath("/imports");
    } catch (revErr) {
      console.error("[importStatement] revalidatePath", revErr);
    }

    return {
      ok: true,
      expensesCreated,
      paymentDueDate: paymentDueDate.toISOString(),
    };
  } catch (e) {
    console.error("[importStatement]", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2022") {
        return {
          ok: false,
          error:
            "La base de datos no tiene columnas nuevas (desincronizada). En Vercel debería aplicarse con el deploy; si sigue igual, ejecutá `npx prisma db push` con la misma DATABASE_URL.",
        };
      }
      if (e.code === "P2002") {
        return { ok: false, error: "Conflicto de datos al guardar (duplicado). Probá de nuevo." };
      }
    }
    const msg = e instanceof Error ? e.message : "Error al importar.";
    return { ok: false, error: msg };
  }
}

export async function importManualStatementAction(formData: FormData): Promise<ImportStatementResult> {
  try {
    const userId = String(formData.get("userId") ?? "");
    const cardId = String(formData.get("cardId") ?? "");
    const importMonth = Number(formData.get("importMonth"));
    const importYear = Number(formData.get("importYear"));
    const totalAmountArs = Number(String(formData.get("totalAmountArs") ?? "").replace(",", "."));
    const paymentDueRaw = formData.get("paymentDueDate");
    const label = String(formData.get("label") ?? "").trim();

    if (!userId || !cardId) return { ok: false, error: "Faltan datos del formulario." };
    if (!Number.isFinite(importMonth) || importMonth < 1 || importMonth > 12) {
      return { ok: false, error: "Mes inválido." };
    }
    if (!Number.isFinite(importYear) || importYear < 2000) {
      return { ok: false, error: "Año inválido." };
    }
    if (!Number.isFinite(totalAmountArs) || totalAmountArs <= 0) {
      return { ok: false, error: "Indicá un total a pagar mayor a 0." };
    }

    let paymentDueDateIso: string | null = null;
    if (typeof paymentDueRaw === "string" && paymentDueRaw.length >= 10) {
      paymentDueDateIso = paymentDueRaw.slice(0, 10);
    }

    const { paymentDueDate } = await importManualStatement({
      userId,
      cardId,
      importMonth,
      importYear,
      totalAmountArs,
      paymentDueDateIso,
      label: label || null,
    });

    try {
      await refreshAlerts(userId, importMonth, importYear);
      const dm = paymentDueDate.getMonth() + 1;
      const dy = paymentDueDate.getFullYear();
      if (dm !== importMonth || dy !== importYear) {
        await refreshAlerts(userId, dm, dy);
      }
    } catch (alertErr) {
      console.error("[importManualStatement] refreshAlerts", alertErr);
    }
    try {
      revalidatePath("/dashboard");
      revalidatePath("/expenses");
      revalidatePath("/reports");
      revalidatePath("/imports");
    } catch (revErr) {
      console.error("[importManualStatement] revalidatePath", revErr);
    }

    return {
      ok: true,
      expensesCreated: 1,
      paymentDueDate: paymentDueDate.toISOString(),
    };
  } catch (e) {
    console.error("[importManualStatement]", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2022") {
        return {
          ok: false,
          error:
            "La base de datos no tiene columnas nuevas (desincronizada). En Vercel debería aplicarse con el deploy; si sigue igual, ejecutá `npx prisma db push` con la misma DATABASE_URL.",
        };
      }
    }
    const msg = e instanceof Error ? e.message : "Error al guardar el resumen manual.";
    return { ok: false, error: msg };
  }
}

const categoryNameSchema = z.string().trim().min(1, "Nombre requerido").max(80);

const createCategoryInput = z.object({ name: categoryNameSchema });

export async function createCategoryAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getDefaultUserId();
  if (!userId) return { ok: false, error: "Sesión inválida." };
  try {
    const { name } = createCategoryInput.parse(input);
    await prisma.category.create({ data: { name, active: true } });
    revalidatePath("/settings");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: e.errors[0]?.message ?? "Dato inválido." };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe una categoría con ese nombre." };
    }
    throw e;
  }
}

const updateCategoryInput = z.object({ id: z.string().min(1), name: categoryNameSchema });

export async function updateCategoryAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getDefaultUserId();
  if (!userId) return { ok: false, error: "Sesión inválida." };
  try {
    const parsed = updateCategoryInput.parse(input);
    await prisma.category.update({
      where: { id: parsed.id },
      data: { name: parsed.name },
    });
    revalidatePath("/settings");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: e.errors[0]?.message ?? "Dato inválido." };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe una categoría con ese nombre." };
    }
    throw e;
  }
}

const setCategoryActiveInput = z.object({ id: z.string().min(1), active: z.boolean() });

export async function setCategoryActiveAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getDefaultUserId();
  if (!userId) return { ok: false, error: "Sesión inválida." };
  try {
    const parsed = setCategoryActiveInput.parse(input);
    await prisma.category.update({
      where: { id: parsed.id },
      data: { active: parsed.active },
    });
    revalidatePath("/settings");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: e.errors[0]?.message ?? "Dato inválido." };
    }
    throw e;
  }
}

const deleteCategoryInput = z.object({ id: z.string().min(1) });

export async function deleteCategoryAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getDefaultUserId();
  if (!userId) return { ok: false, error: "Sesión inválida." };
  try {
    const { id } = deleteCategoryInput.parse(input);
    const n = await prisma.expense.count({ where: { categoryId: id } });
    if (n > 0) {
      return {
        ok: false,
        error: `No se puede eliminar: hay ${n} gasto(s) con esta categoría. Archivala o cambiá esos gastos de categoría.`,
      };
    }
    await prisma.category.delete({ where: { id } });
    revalidatePath("/settings");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: e.errors[0]?.message ?? "Dato inválido." };
    }
    throw e;
  }
}

function formatDueMessageLine(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

const updateStatementImportMetaSchema = z.object({
  statementImportId: z.string().min(1),
  importMonth: z.coerce.number().int().min(1).max(12),
  importYear: z.coerce.number().int().min(2000).max(2100),
});

export async function updateStatementImportMetaAction(
  input: unknown,
): Promise<{ ok: true; paymentDueDate: string } | { ok: false; error: string }> {
  const userId = await getDefaultUserId();
  if (!userId) return { ok: false, error: "Sesión inválida." };
  try {
    const data = updateStatementImportMetaSchema.parse(input);

    const existing = await prisma.statementImport.findFirst({
      where: { id: data.statementImportId, userId },
      include: { card: true },
    });
    if (!existing) return { ok: false, error: "Importación no encontrada." };
    if (!existing.card) {
      return { ok: false, error: "No hay tarjeta asociada; no se puede recalcular el vencimiento." };
    }

    const card = existing.card;
    const oldImportMonth = existing.importMonth;
    const oldImportYear = existing.importYear;
    const oldPaymentDue = existing.paymentDueDate;

    const paymentDueDate = computePaymentDueDate(data.importYear, data.importMonth, card.dueDay);

    await prisma.$transaction(async (tx) => {
      await tx.statementImport.update({
        where: { id: existing.id },
        data: {
          importMonth: data.importMonth,
          importYear: data.importYear,
          paymentDueDate,
        },
      });

      const dueMonth = paymentDueDate.getMonth() + 1;
      const dueYear = paymentDueDate.getFullYear();
      const msg = `Vencimiento de pago (${card.bank} ·••• ${card.last4}): ${formatDueMessageLine(paymentDueDate)}`;

      await tx.alertEvent.updateMany({
        where: { statementImportId: existing.id, alertKind: "payment_due" },
        data: {
          month: dueMonth,
          year: dueYear,
          message: msg,
          dueDate: paymentDueDate,
        },
      });
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true },
    });
    if (user?.googleRefreshToken && existing.googleCalendarEventId) {
      try {
        await updatePaymentDueCalendarEvent({
          refreshToken: user.googleRefreshToken,
          eventId: existing.googleCalendarEventId,
          dueDate: paymentDueDate,
          summary: `Vencimiento tarjeta ${card.bank} ·••• ${card.last4}`,
          description: `Resumen ${existing.fileName} (${data.importMonth}/${data.importYear}). Importado desde CardSpend.`,
        });
      } catch (e) {
        console.error("[updateStatementImportMeta] Google Calendar", e);
      }
    }

    const refreshMonths = new Set<string>();
    const addM = (m: number, y: number) => refreshMonths.add(`${y}-${m}`);
    addM(oldImportMonth, oldImportYear);
    addM(data.importMonth, data.importYear);
    if (oldPaymentDue) {
      addM(oldPaymentDue.getMonth() + 1, oldPaymentDue.getFullYear());
    }
    addM(paymentDueDate.getMonth() + 1, paymentDueDate.getFullYear());

    for (const key of Array.from(refreshMonths)) {
      const [y, m] = key.split("-").map(Number);
      try {
        await refreshAlerts(userId, m, y);
      } catch (e) {
        console.error("[updateStatementImportMeta] refreshAlerts", e);
      }
    }

    try {
      revalidatePath("/dashboard");
      revalidatePath("/expenses");
      revalidatePath("/reports");
      revalidatePath("/imports");
      revalidatePath("/budget");
    } catch (revErr) {
      console.error("[updateStatementImportMeta] revalidatePath", revErr);
    }

    return { ok: true, paymentDueDate: paymentDueDate.toISOString() };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: e.errors[0]?.message ?? "Dato inválido." };
    }
    console.error("[updateStatementImportMeta]", e);
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo actualizar." };
  }
}

const deleteStatementImportSchema = z.object({ statementImportId: z.string().min(1) });

export async function deleteStatementImportAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getDefaultUserId();
  if (!userId) return { ok: false, error: "Sesión inválida." };
  try {
    const { statementImportId } = deleteStatementImportSchema.parse(input);

    const existing = await prisma.statementImport.findFirst({
      where: { id: statementImportId, userId },
    });
    if (!existing) return { ok: false, error: "Importación no encontrada." };

    const oldImportMonth = existing.importMonth;
    const oldImportYear = existing.importYear;
    const oldPaymentDue = existing.paymentDueDate;
    const eventId = existing.googleCalendarEventId;

    await prisma.$transaction(async (tx) => {
      await tx.expense.deleteMany({
        where: { statementImportId, card: { userId } },
      });
      await tx.alertEvent.deleteMany({
        where: { statementImportId, userId },
      });
      await tx.statementImport.delete({ where: { id: statementImportId } });
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true },
    });
    if (user?.googleRefreshToken && eventId) {
      try {
        await deleteCalendarEvent(user.googleRefreshToken, eventId);
      } catch (e) {
        console.error("[deleteStatementImport] Google Calendar", e);
      }
    }

    const refreshMonths = new Set<string>();
    const addM = (m: number, y: number) => refreshMonths.add(`${y}-${m}`);
    addM(oldImportMonth, oldImportYear);
    if (oldPaymentDue) {
      addM(oldPaymentDue.getMonth() + 1, oldPaymentDue.getFullYear());
    }
    for (const key of Array.from(refreshMonths)) {
      const [y, m] = key.split("-").map(Number);
      try {
        await refreshAlerts(userId, m, y);
      } catch (e) {
        console.error("[deleteStatementImport] refreshAlerts", e);
      }
    }

    try {
      revalidatePath("/dashboard");
      revalidatePath("/expenses");
      revalidatePath("/reports");
      revalidatePath("/imports");
      revalidatePath("/budget");
    } catch (revErr) {
      console.error("[deleteStatementImport] revalidatePath", revErr);
    }

    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: e.errors[0]?.message ?? "Dato inválido." };
    }
    console.error("[deleteStatementImport]", e);
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo eliminar." };
  }
}
