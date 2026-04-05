"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteExpenseAction } from "@/app/actions";

export function DeleteExpenseButton({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={() => start(async () => deleteExpenseAction({ id, userId }))}
    >
      {pending ? "…" : "Eliminar"}
    </Button>
  );
}
