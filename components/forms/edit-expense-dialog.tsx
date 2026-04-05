"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/forms/expense-form";
import type { Category, CreditCard, Expense } from "@prisma/client";

export type ExpenseWithRelations = Expense & {
  card: CreditCard;
  category: Category;
};

export function EditExpenseDialog({
  userId,
  cards,
  categories,
  expense,
}: {
  userId: string;
  cards: CreditCard[];
  categories: Category[];
  expense: ExpenseWithRelations;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar gasto</DialogTitle>
        </DialogHeader>
        <ExpenseForm
          key={expense.id}
          userId={userId}
          cards={cards}
          categories={categories}
          expense={expense}
          afterSubmit={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
