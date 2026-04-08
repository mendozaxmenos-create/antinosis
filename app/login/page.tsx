import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppGateLoginForm } from "@/components/forms/app-gate-login-form";
import { logoutAppGateAction } from "@/actions/appGateActions";
import { cookies } from "next/headers";
import { APP_GATE_COOKIE, verifyAppGateToken } from "@/lib/app-gate";
import { Button } from "@/components/ui/button";
import { isAppAuthEnabled } from "@/lib/admin-auth";
import { OAuthLoginButtons } from "@/components/forms/oauth-login-buttons";
import { EmailMagicLinkForm } from "@/components/forms/email-magic-link-form";
import { auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const raw = searchParams?.redirect;
  const redirectTo = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (isAppAuthEnabled()) {
    const session = await auth();
    const email = session?.user?.email ?? null;
    const isAuthed = !!session?.user?.id;
    const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const microsoftEnabled = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
    const magicLinkEnabled = !!(
      process.env.RESEND_API_KEY?.trim() &&
      (process.env.RESEND_FROM?.trim() || process.env.AUTH_EMAIL_FROM?.trim())
    );

    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Acceso a CardSpend</CardTitle>
            <CardDescription>
              Creá tu cuenta o entrá con Google, Microsoft o un enlace a tu correo. Tus datos de la app se guardan en
              esta instalación; el proveedor solo confirma tu identidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isAuthed ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sesión activa como <span className="font-mono text-xs">{email}</span>.
                </p>
                <p className="text-center text-sm">
                  <a href={redirectTo} className="font-medium text-primary underline-offset-4 hover:underline">
                    Continuar a la app
                  </a>
                </p>
              </div>
            ) : null}

            {magicLinkEnabled && !isAuthed ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Entrar con email (sin contraseña)</p>
                <EmailMagicLinkForm callbackUrl={redirectTo} />
              </div>
            ) : null}

            {magicLinkEnabled && !isAuthed ? (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">o</span>
                </div>
              </div>
            ) : null}

            <OAuthLoginButtons
              redirectTo={redirectTo}
              googleEnabled={googleEnabled}
              microsoftEnabled={microsoftEnabled}
              isAuthed={isAuthed}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const password = process.env.APP_PASSWORD;
  if (!password) redirect("/");

  const token = cookies().get(APP_GATE_COOKIE)?.value;
  const alreadyIn = token ? await verifyAppGateToken(password, token) : false;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Acceso a CardSpend</CardTitle>
          <CardDescription>
            Esta instalación está protegida con una contraseña configurada en el servidor{" "}
            <span className="font-mono text-xs">(APP_PASSWORD)</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {alreadyIn ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Ya tenés sesión de acceso activa.</p>
              <form action={logoutAppGateAction}>
                <Button type="submit" variant="outline" className="w-full">
                  Cerrar sesión de acceso
                </Button>
              </form>
              <p className="text-center text-sm">
                <a href={redirectTo} className="font-medium text-primary underline-offset-4 hover:underline">
                  Continuar a la app
                </a>
              </p>
            </div>
          ) : (
            <AppGateLoginForm redirectTo={redirectTo} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
