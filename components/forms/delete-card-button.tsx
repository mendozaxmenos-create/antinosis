"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteCardAction } from "@/app/actions";

export function DeleteCardButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => deleteCardAction({ id }))}
    >
      {pending ? "…" : "Delete"}
    </Button>
  );
}
