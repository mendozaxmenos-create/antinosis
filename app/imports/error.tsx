"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ImportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[imports]", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar Resúmenes</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Ocurrió un error al leer los datos. Suele deberse a que la base en producción no tiene el mismo esquema que el código (falta correr migraciones).</p>
          <p className="text-sm">
            Desde tu PC, con <code className="rounded bg-muted px-1">DATABASE_URL</code> apuntando a Neon:{" "}
            <code className="rounded bg-muted px-1">npx prisma db push</code>
          </p>
          {error.digest ? (
            <p className="font-mono text-xs opacity-80">digest: {error.digest}</p>
          ) : null}
        </AlertDescription>
      </Alert>
      <Button type="button" onClick={() => reset()}>
        Reintentar
      </Button>
    </div>
  );
}
