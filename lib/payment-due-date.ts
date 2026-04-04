/**
 * Fecha de vencimiento de pago típica: mes siguiente al período del resumen,
 * en el día `dueDay` de la tarjeta (ajustado al último día del mes si hace falta).
 */
export function computePaymentDueDate(
  statementYear: number,
  statementMonth: number,
  dueDay: number,
): Date {
  let m = statementMonth + 1;
  let y = statementYear;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(Math.max(1, dueDay), lastDay);
  return new Date(y, m - 1, day, 12, 0, 0, 0);
}
