"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function OAuthLoginButtons({
  redirectTo,
  googleEnabled,
  microsoftEnabled,
  isAuthed,
}: {
  redirectTo: string;
  googleEnabled: boolean;
  microsoftEnabled: boolean;
  isAuthed: boolean;
}) {
  const [pending, setPending] = useState<"google" | "microsoft" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOAuth(
    provider: "google" | "azure-ad",
    label: "google" | "microsoft",
  ) {
    setError(null);
    setPending(label);
    try {
      const res = await signIn(provider, { callbackUrl: redirectTo, redirect: false });
      if (res?.error) {
        setError(res.error === "AccessDenied" ? "Acceso denegado (revisá ADMIN_EMAILS)." : res.error);
        return;
      }
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      setError("No se pudo iniciar el login. Revisá la consola del navegador y NEXTAUTH_URL / AUTH_SECRET en .env.");
    } catch (e) {
      console.error(e);
      setError("Error al conectar con el proveedor. ¿Tenés NEXTAUTH_URL=http://localhost:3000 en .env?");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {!isAuthed ? (
        <>
          {googleEnabled ? (
            <Button
              type="button"
              className="w-full"
              disabled={pending !== null}
              onClick={() => void handleOAuth("google", "google")}
            >
              {pending === "google" ? "Abriendo Google…" : "Entrar con Google"}
            </Button>
          ) : null}
          {microsoftEnabled ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending !== null}
              onClick={() => void handleOAuth("azure-ad", "microsoft")}
            >
              {pending === "microsoft" ? "Abriendo Microsoft…" : "Entrar con Microsoft"}
            </Button>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </>
      ) : (
        <Button type="button" variant="outline" className="w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
          Cerrar sesión
        </Button>
      )}
    </div>
  );
}

