"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatArs, safeFormatDate } from "@/lib/helpers";
import { updateImportedExpenseAmountsAction } from "@/app/actions";
import type { StatementImportListRow } from "@/lib/imports-page-data";

type LineState = {
  expenseId: string;
  amountArs: string;
  originalAmountUsd: string;
  isUsd: boolean;
  label: string;
  dateLabel: string;
};

export function StatementImportPayableDialog({
  row,
  open,
  onOpenChange,
}: {
  row: StatementImportListRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<LineState[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLines(
      row.payableLines.map((p) => ({
        expenseId: p.id,
        amountArs: String(p.amount),
        originalAmountUsd:
          p.originalCurrency === "USD" && p.originalAmount != null ? String(p.originalAmount) : "",
        isUsd: p.originalCurrency === "USD",
        label: [p.merchant, p.description].filter(Boolean).join(" · ") || "—",
        dateLabel: safeFormatDate(p.transactionDate, "d MMM yyyy"),
      })),
    );
  }, [open, row]);

  const totalPreview = useMemo(() => {
    let t = 0;
    for (const ln of lines) {
      const n = Number(String(ln.amountArs).replace(",", "."));
      if (Number.isFinite(n) && n > 0) t += n;
    }
    return t;
  }, [lines]);

  function updateLine(i: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  function save() {
    setError(null);
    const out: {
      expenseId: string;
      amountArs: number;
      originalAmountUsd?: number | null;
    }[] = [];
    for (const ln of lines) {
      const amountArs = Number(String(ln.amountArs).replace(",", "."));
      if (!Number.isFinite(amountArs) || amountArs <= 0) {
        setError("Todos los importes en ARS deben ser mayores a 0.");
        return;
      }
      if (ln.isUsd) {
        const u = Number(String(ln.originalAmountUsd).replace(",", "."));
        if (!Number.isFinite(u) || u <= 0) {
          setError("Completá el monto en USD en las líneas marcadas en dólares.");
          return;
        }
        out.push({ expenseId: ln.expenseId, amountArs, originalAmountUsd: u });
      } else {
        out.push({ expenseId: ln.expenseId, amountArs });
      }
    }
    if (out.length === 0) {
      setError("No hay líneas para guardar.");
      return;
    }
    start(async () => {
      const res = await updateImportedExpenseAmountsAction({
        statementImportId: row.id,
        lines: out,
      });
      if (res.ok) {
        onOpenChange(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setError(null);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0">
        <DialogHeader>
          <DialogTitle>Importes del resumen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground overflow-y-auto pr-1 -mr-1">
          <p>
            El total en pesos que ves en la tabla es la <strong>suma del equivalente en ARS</strong> de cada
            movimiento guardado al importar: cargos en pesos tal cual figuran en el archivo, más cargos en USD
            convertidos con la <strong>cotización BCRA</strong> del día de cada consumo (ver notas del gasto en
            Gastos).
          </p>
          <p>
            Si corregís un monto en ARS o en USD, actualizá también el otro cuando aplique para que siga siendo
            coherente con el resumen.
          </p>
        </div>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No hay movimientos vinculados a este resumen.</p>
        ) : (
          <>
            <div className="border rounded-md overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="overflow-y-auto max-h-[min(50vh,420px)]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2 font-medium w-[88px]">Fecha</th>
                      <th className="p-2 font-medium">Detalle</th>
                      <th className="p-2 font-medium text-right w-[120px]">ARS</th>
                      <th className="p-2 font-medium text-right w-[100px]">USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((ln, i) => (
                      <tr key={ln.expenseId} className="border-t border-border/60">
                        <td className="p-2 align-top text-muted-foreground whitespace-nowrap text-xs">
                          {ln.dateLabel}
                        </td>
                        <td className="p-2 align-top text-xs max-w-[200px] break-words">{ln.label}</td>
                        <td className="p-2 align-top">
                          <Label htmlFor={`ars-${ln.expenseId}`} className="sr-only">
                            ARS
                          </Label>
                          <Input
                            id={`ars-${ln.expenseId}`}
                            inputMode="decimal"
                            className="h-9 text-right tabular-nums"
                            value={ln.amountArs}
                            onChange={(e) => updateLine(i, { amountArs: e.target.value })}
                          />
                        </td>
                        <td className="p-2 align-top">
                          {ln.isUsd ? (
                            <>
                              <Label htmlFor={`usd-${ln.expenseId}`} className="sr-only">
                                USD
                              </Label>
                              <Input
                                id={`usd-${ln.expenseId}`}
                                inputMode="decimal"
                                className="h-9 text-right tabular-nums"
                                value={ln.originalAmountUsd}
                                onChange={(e) => updateLine(i, { originalAmountUsd: e.target.value })}
                              />
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Suma ARS (vista previa):{" "}
                <span className="font-medium text-foreground tabular-nums">{formatArs(totalPreview)}</span>
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={save} disabled={pending}>
                  {pending ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
