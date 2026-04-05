import type { Prisma } from "@prisma/client";

/** Para selects de gastos: activas + cualquier categoría ya usada en movimientos del listado. */
export function categoriesWhereForExpenseForms(usedCategoryIds: string[]): Prisma.CategoryWhereInput {
  const ids = Array.from(new Set(usedCategoryIds.filter(Boolean)));
  if (ids.length === 0) return { active: true };
  return { OR: [{ active: true }, { id: { in: ids } }] };
}
