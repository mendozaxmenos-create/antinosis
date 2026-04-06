"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Requerido para que `signIn` / `signOut` de `next-auth/react` resuelvan bien la URL base en el cliente (App Router).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
