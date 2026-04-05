"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  createCategoryAction,
  deleteCategoryAction,
  setCategoryActiveAction,
  updateCategoryAction,
} from "@/app/actions";
import { useRouter } from "next/navigation";

export type CategoryRow = {
  id: string;
  name: string;
  active: boolean;
  expenseCount: number;
};

export function CategoriesManager({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [editName, setEditName] = useState("");

  function refresh() {
    router.refresh();
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createCategoryAction({ name: newName });
      if (res.ok) {
        setNewName("");
        refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleSaveEdit() {
    if (!editing) return;
    setError(null);
    start(async () => {
      const res = await updateCategoryAction({ id: editing.id, name: editName });
      if (res.ok) {
        setEditing(null);
        refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function toggleActive(row: CategoryRow) {
    setError(null);
    start(async () => {
      await setCategoryActiveAction({ id: row.id, active: !row.active });
      refresh();
    });
  }

  function handleDelete(row: CategoryRow) {
    if (!confirm(`¿Eliminar la categoría «${row.name}»?`)) return;
    setError(null);
    start(async () => {
      const res = await deleteCategoryAction({ id: row.id });
      if (res.ok) refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="new-category">Nueva categoría</Label>
          <Input
            id="new-category"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej. Mascotas, Regalos…"
            maxLength={80}
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending || !newName.trim()}>
          Agregar
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Dialog
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Nombre</Label>
              <Input
                id="edit-category-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={80}
              />
            </div>
            <Button type="button" onClick={handleSaveEdit} disabled={pending || !editName.trim()}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Gastos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialCategories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No hay categorías.
              </TableCell>
            </TableRow>
          ) : (
            initialCategories.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-muted-foreground">{row.expenseCount}</TableCell>
                <TableCell>
                  {row.active ? (
                    <Badge variant="secondary">Activa</Badge>
                  ) : (
                    <Badge variant="outline">Archivada</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        setEditing(row);
                        setEditName(row.name);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => toggleActive(row)}
                    >
                      {row.active ? "Archivar" : "Restaurar"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={pending || row.expenseCount > 0}
                      title={
                        row.expenseCount > 0
                          ? "No se puede eliminar si hay gastos asociados"
                          : "Eliminar categoría"
                      }
                      onClick={() => handleDelete(row)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
