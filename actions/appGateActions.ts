"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { APP_GATE_COOKIE, appGateToken } from "@/lib/app-gate";

function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function loginAppGateAction(
  formData: FormData,
): Promise<{ ok: false; error: string } | undefined> {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return { ok: false, error: "La contraseña de acceso no está configurada." };
  }

  const submitted = String(formData.get("password") ?? "");
  if (submitted !== password) {
    return { ok: false, error: "Contraseña incorrecta." };
  }

  const token = await appGateToken(password);
  const maxAge = 60 * 60 * 24 * 30;

  cookies().set(APP_GATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  redirect(safeRedirectPath(formData.get("redirect")?.toString()));
}

export async function logoutAppGateAction(): Promise<void> {
  cookies().delete(APP_GATE_COOKIE);
  redirect("/login");
}
