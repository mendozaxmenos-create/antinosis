"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteExpenseAction } from "@/app/actions";

export function DeleteExpenseButton({
  id,
  userId,
  month,
  year,
}: {
  id: string;
  userId: string;
  month: number;
  year: number;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={() => start(async () => deleteExpenseAction({ id, userId, month, year }))}
    >
      {pending ? "…" : "Delete"}
    </Button>
  );
}
