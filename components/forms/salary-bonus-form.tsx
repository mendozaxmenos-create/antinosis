"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSalaryBonusAction, deleteSalaryBonusAction } from "@/actions/salaryBonusActions";
import { formatCurrency } from "@/lib/helpers";
import { useRouter } from "next/navigation";

export type SalaryBonusRow = {
  id: string;
  month: number;
  year: number;
  amount: number;
  label: string | null;
};

export function SalaryBonusForm({
  defaultMonth,
  defaultYear,
  monthLabels,
  initialBonuses,
}: {
  defaultMonth: number;
  defaultYear: number;
  monthLabels: { value: number; label: string }[];
  initialBonuses: SalaryBonusRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");

  const years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 3 + i);

  function refresh() {
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(amount.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    start(async () => {
      const res = await createSalaryBonusAction({
        month,
        year,
        amount: n,
        label: label.trim() || null,
      });
      if (res.ok) {
        setAmount("");
        setLabel("");
        refresh();
      } else {
        setError(res.error ?? "No se pudo guardar.");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este bono?")) return;
    setError(null);
    start(async () => {
      const res = await deleteSalaryBonusAction(id);
      if (res.ok) refresh();
      else setError(res.error ?? "No se pudo eliminar.");
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="bonus-month">Mes</Label>
            <select
              id="bonus-month"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              disabled={pending}
            >
              {monthLabels.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bonus-year">Año</Label>
            <select
              id="bonus-year"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={pending}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bonus-amount">Monto</Label>
            <Input
              id="bonus-amount"
              inputMode="decimal"
              placeholder="Ej. 150000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bonus-label">Nota (opcional)</Label>
            <Input
              id="bonus-label"
              placeholder="Ej. Aguinaldo, bono anual…"
              maxLength={120}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || !amount.trim()}>
            Registrar bono
          </Button>
          {error ? <span className="text-sm text-destructive">{error}</span> : null}
        </div>
      </form>

      <div>
        <h3 className="mb-2 text-sm font-medium">Bonos registrados</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialBonuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Todavía no cargaste bonos.
                </TableCell>
              </TableRow>
            ) : (
              initialBonuses.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    {String(b.month).padStart(2, "0")}/{b.year}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {b.label ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(b.amount)}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={pending}
                      onClick={() => handleDelete(b.id)}
                    >
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
