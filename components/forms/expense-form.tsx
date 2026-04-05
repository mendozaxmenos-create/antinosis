"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExpenseAction, updateExpenseAction } from "@/app/actions";
import { useTransition } from "react";
import type { CreditCard, Category, Expense } from "@prisma/client";
import { ExpenseImageImport } from "@/components/forms/expense-image-import";

const schema = z.object({
  transactionDate: z.string().min(1),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  merchant: z.string().optional(),
  installments: z.coerce.number().int().min(1).default(1),
  notes: z.string().optional(),
  cardId: z.string().min(1),
  categoryId: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function ExpenseForm({
  userId,
  cards,
  categories,
  expense,
}: {
  userId: string;
  cards: CreditCard[];
  categories: Category[];
  expense?: Expense;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? {
          transactionDate: expense.transactionDate.toISOString().slice(0, 10),
          amount: expense.amount,
          description: expense.description ?? "",
          merchant: expense.merchant ?? "",
          installments: expense.installments,
          notes: expense.notes ?? "",
          cardId: expense.cardId,
          categoryId: expense.categoryId,
        }
      : {
          transactionDate: new Date().toISOString().slice(0, 10),
          amount: 0,
          description: "",
          merchant: "",
          installments: 1,
          notes: "",
          cardId: cards[0]?.id ?? "",
          categoryId: categories[0]?.id ?? "",
        },
  });
  const [pending, start] = useTransition();

  function onSubmit(values: FormValues) {
    start(async () => {
      const payload = {
        userId,
        ...values,
      };
      if (expense) {
        await updateExpenseAction({ ...payload, id: expense.id });
      } else {
        await createExpenseAction(payload);
      }
      if (!expense) form.reset({
        ...form.getValues(),
        amount: 0,
        description: "",
        merchant: "",
        notes: "",
      });
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {!expense && (
        <ExpenseImageImport form={form} disabled={cards.length === 0} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Date</Label>
        <Input type="date" {...form.register("transactionDate")} />
      </div>
      <div className="space-y-2">
        <Label>Amount</Label>
        <Input type="number" step="0.01" {...form.register("amount")} />
      </div>
      <div className="space-y-2">
        <Label>Card</Label>
        <Select
          value={form.watch("cardId")}
          onValueChange={(v) => form.setValue("cardId", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Card" />
          </SelectTrigger>
          <SelectContent>
            {cards.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.bank} ·••• {c.last4}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={form.watch("categoryId")}
          onValueChange={(v) => form.setValue("categoryId", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Merchant</Label>
        <Input {...form.register("merchant")} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Description</Label>
        <Input {...form.register("description")} />
      </div>
      <div className="space-y-2">
        <Label>Installments</Label>
        <Input type="number" {...form.register("installments")} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Notes</Label>
        <Textarea rows={3} {...form.register("notes")} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || cards.length === 0}>
          {pending ? "Saving…" : expense ? "Update expense" : "Add expense"}
        </Button>
      </div>
      </div>
    </form>
  );
}
