import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppGateLoginForm } from "@/components/forms/app-gate-login-form";
import { logoutAppGateAction } from "@/actions/appGateActions";
import { cookies } from "next/headers";
import { APP_GATE_COOKIE, verifyAppGateToken } from "@/lib/app-gate";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    redirect("/");
  }

  const raw = searchParams?.redirect;
  const redirectTo = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

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
