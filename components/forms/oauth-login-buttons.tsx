"use client";

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
  return (
    <div className="space-y-3">
      {!isAuthed ? (
        <>
          {googleEnabled ? (
            <Button
              type="button"
              className="w-full"
              onClick={() => signIn("google", { callbackUrl: redirectTo })}
            >
              Entrar con Google
            </Button>
          ) : null}
          {microsoftEnabled ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => signIn("azure-ad", { callbackUrl: redirectTo })}
            >
              Entrar con Microsoft
            </Button>
          ) : null}
        </>
      ) : (
        <Button type="button" variant="outline" className="w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
          Cerrar sesión
        </Button>
      )}
    </div>
  );
}

