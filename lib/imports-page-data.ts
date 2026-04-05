import { prisma } from "@/lib/prisma";
import type { CreditCard, ReconciliationResult } from "@prisma/client";

type UserCal = {
  googleRefreshToken: string | null;
  googleCalendarEmail: string | null;
};

export type ImportsPageData =
  | {
      ok: true;
      user: UserCal;
      imports: Awaited<
        ReturnType<
          typeof prisma.statementImport.findMany<{ include: { card: true } }>
        >
      >;
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

  return {
    ok: true,
    user: u.value,
    imports,
    reconciliations,
    cards,
    loadWarnings,
  };
}
