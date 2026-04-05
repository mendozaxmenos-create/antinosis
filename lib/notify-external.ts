import { prisma } from "@/lib/prisma";

/**
 * Envía alertas fuera de la app según preferencias del usuario (Telegram / email).
 * Canal "app" = solo registro en BD + panel (sin envío externo).
 */

export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[telegram] Falta TELEGRAM_BOT_TOKEN en el servidor");
    return false;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId.trim(),
      text,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[telegram] sendMessage", res.status, err);
    return false;
  }
  return true;
}

async function sendEmailViaResend(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    console.warn("[email] Falta RESEND_API_KEY o RESEND_FROM");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    console.error("[resend]", await res.text());
    return false;
  }
  return true;
}

export async function deliverExternalAlerts(userId: string, lines: string[]): Promise<void> {
  if (lines.length === 0) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      alertChannel: true,
      alertEmail: true,
      telegramChatId: true,
    },
  });
  if (!user) return;

  const channel = user.alertChannel ?? "app";
  if (channel === "app") return;

  const body = [`Hola ${user.name},`, "", ...lines.map((l) => `• ${l}`)].join("\n");
  const title = "CardSpend — alerta";

  if (channel === "telegram") {
    if (!user.telegramChatId?.trim()) return;
    await sendTelegramMessage(user.telegramChatId, `${title}\n\n${body}`);
    return;
  }

  if (channel === "email") {
    if (!user.alertEmail?.trim()) return;
    await sendEmailViaResend(user.alertEmail.trim(), title, body);
  }
}
