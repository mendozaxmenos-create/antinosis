"use client";

import { useMemo, useState, useTransition } from "react";
import type { CreditCard } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importStatementCsvAction } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function StatementUploadForm({
  userId,
  cards,
  defaultMonth,
  defaultYear,
}: {
  userId: string;
  cards: CreditCard[];
  defaultMonth: number;
  defaultYear: number;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(2000, i, 1).toLocaleString("es-AR", { month: "long" }),
      })),
    [],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await importStatementCsvAction(fd);
      if (res.ok) {
        const d = new Date(res.paymentDueDate);
        setMessage(
          `Se importaron ${res.expensesCreated} movimientos. Vencimiento de pago estimado: ${d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}.`,
        );
        (e.target as HTMLFormElement).reset();
      } else {
        setError(res.error);
      }
    });
  }

  if (cards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Creá al menos una tarjeta en <a className="underline" href="/cards">Tarjetas</a>.
      </p>
    );
  }

  const selectClass = cn(
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cardId">Tarjeta del resumen</Label>
          <select id="cardId" name="cardId" className={selectClass} defaultValue={cards[0]!.id} required>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.bank} ·••• {c.last4} (vence día {c.dueDay})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="importMonth">Mes del resumen</Label>
            <select
              id="importMonth"
              name="importMonth"
              className={selectClass}
              defaultValue={String(defaultMonth)}
              required
            >
              {months.map((m) => (
                <option key={m.value} value={String(m.value)}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="importYear">Año</Label>
            <Input type="number" id="importYear" name="importYear" defaultValue={defaultYear} min={2000} max={2100} required />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="csv">Archivo CSV o PDF</Label>
        <Input
          id="csv"
          name="file"
          type="file"
          accept=".csv,text/csv,application/pdf,.pdf"
          required
        />
        <p className="text-xs text-muted-foreground">
          <strong>CSV:</strong> columnas fecha (date/fecha), monto (amount/monto/importe), opcional descripción y comercio;
          separador <code className="text-[11px]">,</code> o <code className="text-[11px]">;</code>. Montos tipo{" "}
          <code className="text-[11px]">$ 1.234,56</code> (ARS). <strong>Brubank (PDF):</strong> cargos en{" "}
          <strong>U$S</strong> se convierten a pesos con la <strong>cotización USD oficial del BCRA</strong> (día hábil;
          si falta cotización, el día anterior con dato). Ese ARS suma al total a pagar y al panel. Los importados{" "}
          <strong>no restan del límite mensual</strong> de gasto en curso.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertTitle>Importación lista</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Importando…" : "Importar y generar alerta de vencimiento"}
      </Button>
    </form>
  );
}
