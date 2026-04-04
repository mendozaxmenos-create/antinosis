"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCardAction, updateCardAction } from "@/app/actions";
import { useTransition } from "react";
import type { CreditCard } from "@prisma/client";

const schema = z.object({
  bank: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  last4: z.string().length(4),
  closingDay: z.coerce.number().min(1).max(31),
  dueDay: z.coerce.number().min(1).max(31),
  active: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CardForm({
  userId,
  card,
  onDone,
}: {
  userId: string;
  card?: CreditCard;
  onDone?: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: card
      ? {
          bank: card.bank,
          name: card.name,
          brand: card.brand ?? "",
          last4: card.last4,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          active: card.active,
        }
      : {
          bank: "",
          name: "",
          brand: "",
          last4: "",
          closingDay: 15,
          dueDay: 10,
          active: true,
        },
  });
  const [pending, start] = useTransition();

  function onSubmit(values: FormValues) {
    start(async () => {
      if (card) {
        await updateCardAction({
          id: card.id,
          userId,
          bank: values.bank,
          name: values.name,
          brand: values.brand || undefined,
          last4: values.last4,
          closingDay: values.closingDay,
          dueDay: values.dueDay,
          active: values.active ?? true,
        });
      } else {
        await createCardAction({
          userId,
          bank: values.bank,
          name: values.name,
          brand: values.brand || undefined,
          last4: values.last4,
          closingDay: values.closingDay,
          dueDay: values.dueDay,
          active: values.active ?? true,
        });
      }
      onDone?.();
      form.reset(values);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="bank">Bank</Label>
        <Input id="bank" {...form.register("bank")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Card name</Label>
        <Input id="name" {...form.register("name")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="brand">Brand</Label>
        <Input id="brand" {...form.register("brand")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="last4">Last 4 digits</Label>
        <Input id="last4" maxLength={4} {...form.register("last4")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="closing">Closing day</Label>
        <Input id="closing" type="number" {...form.register("closingDay")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="due">Due day</Label>
        <Input id="due" type="number" {...form.register("dueDay")} />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" {...form.register("active", { valueAsBoolean: true } as never)} />
        Active
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : card ? "Update card" : "Add card"}
        </Button>
      </div>
    </form>
  );
}
