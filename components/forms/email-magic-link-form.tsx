"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailMagicLinkForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("email", {
        email: email.trim().toLowerCase(),
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setError("No se pudo enviar el correo. Revisá Resend y el remitente (RESEND_FROM).");
        return;
      }
      setSent(true);
    } catch (err) {
      console.error(err);
      setError("Error al enviar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
        Revisá tu correo: te enviamos un enlace para entrar. Si no lo ves, mirá spam o promociones.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <Button type="submit" className="w-full" variant="secondary" disabled={loading}>
        {loading ? "Enviando…" : "Enviar enlace al correo"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
