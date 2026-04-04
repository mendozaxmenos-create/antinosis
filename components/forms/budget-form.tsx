"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBudgetAction } from "@/app/actions";
import { calculateMonthlyLimit } from "@/lib/calculations";
import { formatCurrency } from "@/lib/helpers";
import { useMemo, useTransition } from "react";

const preprocessNum = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const schema = z.object({
  monthlyIncome: z.preprocess(preprocessNum, z.number().nonnegative().optional()),
  allowedPercentage: z.preprocess(preprocessNum, z.number().min(0).max(100).optional()),
  manualCardLimit: z.preprocess(preprocessNum, z.number().nonnegative().optional()),
  t60: z.boolean(),
  t70: z.boolean(),
  t80: z.boolean(),
  t90: z.boolean(),
  t100: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function BudgetForm({
  userId,
  month,
  year,
  initial,
}: {
  userId: string;
  month: number;
  year: number;
  initial: {
    monthlyIncome: number | null;
    allowedPercentage: number | null;
    manualCardLimit: number | null;
    computedCardLimit: number;
    thresholds: { percentage: number; enabled: boolean }[];
  };
}) {
  const mapT = (p: number) => initial.thresholds.find((t) => t.percentage === p)?.enabled ?? true;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      monthlyIncome: initial.monthlyIncome ?? undefined,
      allowedPercentage: initial.allowedPercentage ?? undefined,
      manualCardLimit: initial.manualCardLimit ?? undefined,
      t60: mapT(60),
      t70: mapT(70),
      t80: mapT(80),
      t90: mapT(90),
      t100: mapT(100),
    },
  });

  const [pending, start] = useTransition();

  const watched = form.watch();
  const preview = useMemo(
    () =>
      calculateMonthlyLimit({
        monthlyIncome: watched.monthlyIncome ?? null,
        allowedPercentage: watched.allowedPercentage ?? null,
        manualCardLimit: watched.manualCardLimit ?? null,
      }),
    [watched.monthlyIncome, watched.allowedPercentage, watched.manualCardLimit],
  );

  function onSubmit(values: FormValues) {
    start(async () => {
      await saveBudgetAction({
        userId,
        month,
        year,
        monthlyIncome: values.monthlyIncome ?? null,
        allowedPercentage: values.allowedPercentage ?? null,
        manualCardLimit: values.manualCardLimit ?? null,
        thresholds: [
          { percentage: 60, enabled: values.t60 },
          { percentage: 70, enabled: values.t70 },
          { percentage: 80, enabled: values.t80 },
          { percentage: 90, enabled: values.t90 },
          { percentage: 100, enabled: values.t100 },
        ],
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly budget configuration</CardTitle>
        <CardDescription>
          Manual limit overrides income × percentage. Preview updates as you type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="income">Monthly income</Label>
              <Input id="income" type="number" step="0.01" {...form.register("monthlyIncome")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pct">Allowed % of income</Label>
              <Input id="pct" type="number" step="0.1" {...form.register("allowedPercentage")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="manual">Manual card limit (optional override)</Label>
              <Input id="manual" type="number" step="0.01" {...form.register("manualCardLimit")} />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium">Computed monthly credit card budget</p>
            <p className="text-2xl font-semibold">{formatCurrency(preview)}</p>
            <p className="text-xs text-muted-foreground">Stored value after save: {formatCurrency(initial.computedCardLimit)}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Alert thresholds</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["t60", "60%"],
                  ["t70", "70%"],
                  ["t80", "80%"],
                  ["t90", "90%"],
                  ["t100", "100%"],
                ] as const
              ).map(([name, label]) => (
                <label key={name} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...form.register(name, { valueAsBoolean: true } as never)}
                  />
                  Notify at {label}
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save budget"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
