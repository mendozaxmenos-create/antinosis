"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { saveAlertChannelAction } from "@/app/actions";
import { MessageCircle, Mail, Monitor, Smartphone } from "lucide-react";

const CHANNELS = [
  {
    value: "app" as const,
    label: "Solo en la app",
    description: "Ver alertas en el panel y en la sección Alertas; sin envío externo.",
    icon: Monitor,
  },
  {
    value: "telegram" as const,
    label: "Telegram",
    description: "Mensajes por un bot de Telegram (requiere token del bot en el servidor).",
    icon: MessageCircle,
  },
  {
    value: "email" as const,
    label: "Email",
    description: "Requiere API Resend configurada en el hosting (RESEND_API_KEY).",
    icon: Mail,
  },
];

export function AlertChannelForm({
  userId,
  initial,
}: {
  userId: string;
  initial: {
    alertChannel: string;
    alertEmail: string | null;
    telegramChatId: string | null;
  };
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [channel, setChannel] = useState<"app" | "email" | "telegram">(() => {
    const c = initial.alertChannel;
    if (c === "email" || c === "telegram") return c;
    return "app";
  });
  const [email, setEmail] = useState(initial.alertEmail ?? "");
  const [chatId, setChatId] = useState(initial.telegramChatId ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    start(async () => {
      const res = await saveAlertChannelAction({
        userId,
        alertChannel: channel,
        alertEmail: email.trim() || null,
        telegramChatId: chatId.trim() || null,
      });
      if (res.ok) setMessage("Preferencias guardadas.");
      else setError(res.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Canal de alertas</CardTitle>
        <CardDescription>
          Elegí cómo querés recibir avisos cuando superás umbrales de presupuesto o hay vencimientos de pago
          (además de verlos siempre en el panel).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Smartphone className="h-4 w-4" />
          <AlertTitle>WhatsApp</AlertTitle>
          <AlertDescription>
            No está integrado en esta versión: la API oficial de Meta (WhatsApp Business) exige cuenta de negocio,
            verificación y un proveedor como Twilio. Como alternativa inmediata usá <strong>Telegram</strong> o{" "}
            <strong>email</strong>.
          </AlertDescription>
        </Alert>

        <form onSubmit={onSubmit} className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Medio principal</legend>
            <div className="grid gap-3 sm:grid-cols-1">
              {CHANNELS.map(({ value, label, description, icon: Icon }) => (
                <label
                  key={value}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                    channel === value ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="alertChannel"
                    value={value}
                    checked={channel === value}
                    onChange={() => setChannel(value)}
                    className="mt-1"
                  />
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {channel === "telegram" && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <Label htmlFor="tg-chat">ID de chat de Telegram</Label>
              <Input
                id="tg-chat"
                placeholder="Ej. 123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                1) En Telegram, hablá con <strong>@BotFather</strong>, creá un bot con <code>/newbot</code> y copiá el{" "}
                <strong>token</strong>. 2) Configurá <code>TELEGRAM_BOT_TOKEN</code> en el servidor (.env / Vercel). 3)
                Iniciá chat con tu bot y enviá un mensaje. 4) Abrí{" "}
                <code className="text-[11px]">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> y copiá el{" "}
                <code>chat.id</code>, o usá @userinfobot. Pegá ese número arriba.
              </p>
            </div>
          )}

          {channel === "email" && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <Label htmlFor="alert-email">Email para alertas</Label>
              <Input
                id="alert-email"
                type="email"
                placeholder="vos@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <p className="text-xs text-muted-foreground">
                En Vercel tenés que definir <code>RESEND_API_KEY</code> y <code>RESEND_FROM</code> (dominio verificado
                en Resend).
              </p>
            </div>
          )}

          {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar canal de alertas"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
