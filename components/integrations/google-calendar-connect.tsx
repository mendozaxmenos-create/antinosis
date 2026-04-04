import Link from "next/link";
import { Button } from "@/components/ui/button";
import { disconnectGoogleCalendarAction } from "@/app/actions";
import { Calendar } from "lucide-react";

type Props = {
  userId: string;
  connected: boolean;
  email: string | null;
  configured: boolean;
};

export function GoogleCalendarConnect({ userId, connected, email, configured }: Props) {
  if (!configured) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Google Calendar</p>
        <p className="mt-1">
          Para crear eventos automáticos al importar un resumen, configurá en <code className="rounded bg-muted px-1">.env</code> las
          variables <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code>,{" "}
          <code className="rounded bg-muted px-1">GOOGLE_CLIENT_SECRET</code> y{" "}
          <code className="rounded bg-muted px-1">NEXT_PUBLIC_APP_URL</code> (ver README).
        </p>
      </div>
    );
  }

  const authUrl = `/api/google-calendar/auth?userId=${encodeURIComponent(userId)}`;

  if (connected) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Google Calendar conectado</p>
            <p className="text-sm text-muted-foreground">{email ?? "Cuenta vinculada"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Al importar un resumen se creará un evento de día completo en el día de vencimiento de pago.
            </p>
          </div>
        </div>
        <form action={disconnectGoogleCalendarAction}>
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" variant="outline" size="sm">
            Desconectar
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Conectar Google Calendar</p>
            <p className="text-sm text-muted-foreground">
              Autorizá la app para crear eventos en tu calendario principal cuando subas un resumen (vencimiento de pago).
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={authUrl}>Conectar con Google</Link>
        </Button>
      </div>
    </div>
  );
}
