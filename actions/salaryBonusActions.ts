"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthSession } from "@/lib/admin-auth";
import { getCurrentUserId } from "@/lib/user";

const createSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  amount: z.number().positive(),
  label: z.string().max(120).optional().nullable(),
});

export async function createSalaryBonusAction(input: {
  month: number;
  year: number;
  amount: number;
  label?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAuthSession();
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "No hay usuario." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisá mes, año y monto." };
  }

  const { month, year, amount, label } = parsed.data;
  await prisma.salaryBonus.create({
    data: {
      userId,
      month,
      year,
      amount,
      label: label?.trim() || null,
    },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteSalaryBonusAction(
  bonusId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAuthSession();
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "No hay usuario." };

  const row = await prisma.salaryBonus.findFirst({
    where: { id: bonusId, userId },
  });
  if (!row) return { ok: false, error: "No encontrado." };

  await prisma.salaryBonus.delete({ where: { id: bonusId } });
  revalidatePath("/settings");
  return { ok: true };
}
