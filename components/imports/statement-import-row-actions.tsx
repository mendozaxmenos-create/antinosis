"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2, Wallet2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { deleteStatementImportAction, updateStatementImportMetaAction } from "@/app/actions";
import type { StatementImportListRow } from "@/lib/imports-page-data";
import { StatementImportPayableDialog } from "@/components/imports/statement-import-payable-dialog";

export function StatementImportRowActions({ row }: { row: StatementImportListRow }) {
  const [editOpen, setEditOpen] = useState(false);
  const [payableOpen, setPayableOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(2000, i, 1).toLocaleString("es-AR", { month: "long" }),
      })),
    [],
  );

  const selectClass = cn(
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  );

  const canEdit = !!row.card;

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const importMonth = Number(fd.get("importMonth"));
    const importYear = Number(String(fd.get("importYear")).trim());
    start(async () => {
      const res = await updateStatementImportMetaAction({
        statementImportId: row.id,
        importMonth,
        importYear,
      });
      if (res.ok) {
        setEditOpen(false);
      } else {
        setError(res.error);
      }
    });
  }

  function handleDelete() {
    setError(null);
    start(async () => {
      const res = await deleteStatementImportAction({ statementImportId: row.id });
      if (res.ok) {
        setDeleteOpen(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          title="Editar importes en ARS (y USD si aplica)"
          onClick={() => {
            setError(null);
            setPayableOpen(true);
          }}
        >
          <Wallet2 className="h-4 w-4" />
          <span className="sr-only">Importes</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          disabled={!canEdit}
          title={
            canEdit
              ? "Corregir mes/año del período"
              : "Sin tarjeta: no se puede recalcular el vencimiento"
          }
          onClick={() => {
            setError(null);
            setEditOpen(true);
          }}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Período</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-destructive hover:text-destructive"
          onClick={() => {
            setError(null);
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar</span>
        </Button>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Período del resumen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Corregí el mes y año del resumen (ej. si lo subiste como mayo pero correspondía a marzo). Se recalcula el
            vencimiento según el día de vencimiento de la tarjeta y se actualiza la alerta y Google Calendar si aplica.
          </p>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`edit-m-${row.id}`}>Mes del resumen</Label>
                <select
                  id={`edit-m-${row.id}`}
                  name="importMonth"
                  className={selectClass}
                  defaultValue={row.importMonth}
                  required
                >
                  {months.map((mo) => (
                    <option key={mo.value} value={mo.value}>
                      {mo.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-y-${row.id}`}>Año</Label>
                <Input
                  id={`edit-y-${row.id}`}
                  name="importYear"
                  type="number"
                  min={2000}
                  max={2100}
                  defaultValue={row.importYear}
                  required
                />
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || !canEdit}>
                {pending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <StatementImportPayableDialog row={row} open={payableOpen} onOpenChange={setPayableOpen} />

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar importación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se borrarán todos los movimientos de este resumen, la alerta de vencimiento y el registro de importación.
            {row.googleCalendarEventId ? " También se intentará quitar el evento de Google Calendar." : null}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{row.fileName}</p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "Eliminando…" : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
