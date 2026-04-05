"use client";

import { useMemo, useState, useTransition } from "react";
import type { CreditCard } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importManualStatementAction } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function ManualStatementForm({
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
      const res = await importManualStatementAction(fd);
      if (res.ok) {
        const d = new Date(res.paymentDueDate);
        setMessage(
          `Se registró el total del resumen (1 movimiento). Vencimiento de pago: ${d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}. Entra en el panel como “a pagar” en ese mes, igual que un CSV/PDF.`,
        );
        (e.target as HTMLFormElement).reset();
        const y = (e.target as HTMLFormElement).elements.namedItem("importYear") as HTMLInputElement;
        const m = (e.target as HTMLFormElement).elements.namedItem("importMonth") as HTMLSelectElement;
        if (y) y.value = String(defaultYear);
        if (m) m.value = String(defaultMonth);
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
          <Label htmlFor="manual-cardId">Tarjeta / crédito</Label>
          <select id="manual-cardId" name="cardId" className={selectClass} defaultValue={cards[0]!.id} required>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.bank} ·••• {c.last4} (vence día {c.dueDay})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="manual-importMonth">Mes del resumen</Label>
            <select
              id="manual-importMonth"
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
            <Label htmlFor="manual-importYear">Año</Label>
            <Input
              type="number"
              id="manual-importYear"
              name="importYear"
              defaultValue={defaultYear}
              min={2000}
              max={2100}
              required
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="totalAmountArs">Total a pagar del resumen (ARS)</Label>
          <Input
            id="totalAmountArs"
            name="totalAmountArs"
            type="text"
            inputMode="decimal"
            placeholder="Ej. 125000.50"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentDueDate">Vencimiento del pago (opcional)</Label>
          <Input id="paymentDueDate" name="paymentDueDate" type="date" />
          <p className="text-xs text-muted-foreground">
            Si lo dejás vacío, se usa el <strong>día de vencimiento de la tarjeta</strong> en el mes siguiente al período (como
            un resumen con archivo). Para créditos tipo Mercado Pago que vencen a principios de mes, podés fijar la fecha
            acá.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">Etiqueta (opcional)</Label>
        <Input
          id="label"
          name="label"
          type="text"
          placeholder="Ej. Mercado Pago crédito"
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground">Aparece como comercio y en el historial de importaciones.</p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertTitle>Listo</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Registrar resumen manual"}
      </Button>
    </form>
  );
}
