"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBudgetAction } from "@/app/actions";
import { explainBudgetComputation } from "@/lib/calculations";
import { formatCurrency } from "@/lib/helpers";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";

const preprocessNum = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const schema = z.object({
  monthlyIncome: z.preprocess(preprocessNum, z.number().nonnegative().optional()),
  soledadCashTransfer: z.preprocess(preprocessNum, z.number().nonnegative().optional()),
  savingsPercentage: z.preprocess(preprocessNum, z.number().min(0).max(100).optional()),
  manualCardLimit: z.preprocess(preprocessNum, z.number().nonnegative().optional()),
  t60: z.boolean(),
  t70: z.boolean(),
  t80: z.boolean(),
  t90: z.boolean(),
  t100: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function MonthYearNav({
  month,
  year,
  labels,
}: {
  month: number;
  year: number;
  labels: { value: number; label: string }[];
}) {
  const router = useRouter();
  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => y - 3 + i);
  }, []);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="cfg-month">Mes</Label>
        <select
          id="cfg-month"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-44"
          value={month}
          onChange={(e) => {
            const m = Number(e.target.value);
            router.push(`/settings?month=${m}&year=${year}`);
          }}
        >
          {labels.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cfg-year">Año</Label>
        <select
          id="cfg-year"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-32"
          value={year}
          onChange={(e) => {
            const y = Number(e.target.value);
            router.push(`/settings?month=${month}&year=${y}`);
          }}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function SettingsBudgetForm({
  userId,
  month,
  year,
  monthLabels,
  cardPaymentsDueInMonth,
  initial,
}: {
  userId: string;
  month: number;
  year: number;
  monthLabels: { value: number; label: string }[];
  /** Total a pagar por resúmenes con vencimiento en el mes seleccionado (solo lectura; viene de importaciones). */
  cardPaymentsDueInMonth: number;
  initial: {
    monthlyIncome: number | null;
    soledadCashTransfer: number;
    savingsPercentage: number | null;
    allowedPercentage: number | null;
    manualCardLimit: number | null;
    thresholds: { percentage: number; enabled: boolean }[];
  };
}) {
  const router = useRouter();
  const savingsDefault =
    initial.savingsPercentage ??
    (initial.allowedPercentage != null ? 100 - initial.allowedPercentage : 0);

  const mapT = (p: number) => initial.thresholds.find((t) => t.percentage === p)?.enabled ?? true;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      monthlyIncome: initial.monthlyIncome ?? undefined,
      soledadCashTransfer: initial.soledadCashTransfer ?? 0,
      savingsPercentage: savingsDefault,
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
      explainBudgetComputation({
        monthlyIncome: watched.monthlyIncome ?? null,
        allowedPercentage: null,
        manualCardLimit: watched.manualCardLimit ?? null,
        soledadCashTransfer: watched.soledadCashTransfer ?? 0,
        savingsPercentage: watched.savingsPercentage ?? 0,
        cardPaymentsDueInMonth,
      }),
    [
      watched.monthlyIncome,
      watched.soledadCashTransfer,
      watched.savingsPercentage,
      watched.manualCardLimit,
      cardPaymentsDueInMonth,
    ],
  );

  function onSubmit(values: FormValues) {
    start(async () => {
      await saveBudgetAction({
        userId,
        month,
        year,
        monthlyIncome: values.monthlyIncome ?? null,
        allowedPercentage: null,
        soledadCashTransfer: values.soledadCashTransfer ?? 0,
        savingsPercentage: values.savingsPercentage ?? 0,
        manualCardLimit: values.manualCardLimit ?? null,
        thresholds: [
          { percentage: 60, enabled: values.t60 },
          { percentage: 70, enabled: values.t70 },
          { percentage: 80, enabled: values.t80 },
          { percentage: 90, enabled: values.t90 },
          { percentage: 100, enabled: values.t100 },
        ],
      });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Límite mensual en tarjeta</CardTitle>
        <CardDescription>
          El <strong>sueldo neto lo cargás vos</strong> (podés estimarlo si todavía no cobraste ese mes) y{" "}
          <strong>podés editarlo cuando quieras</strong> — por ejemplo si te informan un aumento o cuando tengas el
          recibo final. El panel y el límite usan siempre el valor guardado acá. La gráfica de evolución toma el mismo
          número por mes: no se calcula solo desde los resúmenes; los resúmenes ajustan los pagos de tarjeta, no el
          sueldo.
        </CardDescription>
        <MonthYearNav month={month} year={year} labels={monthLabels} />
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="net">Sueldo neto (este mes)</Label>
              <Input id="net" type="number" step="0.01" min={0} {...form.register("monthlyIncome")} />
              <p className="text-xs text-muted-foreground">
                Es el monto que querés usar para las cuentas de este mes en el panel; la evolución histórica usa este
                mismo valor una vez guardado. Si cambia el importe (aumento, error de carga), guardá de nuevo.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="soledad">Transferido en efectivo a Soledad</Label>
              <Input
                id="soledad"
                type="number"
                step="0.01"
                min={0}
                {...form.register("soledadCashTransfer")}
              />
              <p className="text-xs text-muted-foreground">Se descuenta del sueldo neto antes de los vencimientos de tarjeta y el ahorro.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="savepct">% del disponible para ahorro</Label>
              <Input
                id="savepct"
                type="number"
                step="0.1"
                min={0}
                max={100}
                {...form.register("savingsPercentage")}
              />
              <p className="text-xs text-muted-foreground">
                Sobre el monto que queda después de Soledad y de los pagos con vencimiento en este mes. El resto es el
                tope para gasto en curso (salvo tope manual).
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="manual">Tope manual en tarjeta (opcional)</Label>
              <Input id="manual" type="number" step="0.01" min={0} {...form.register("manualCardLimit")} />
              <p className="text-xs text-muted-foreground">Si cargás un valor mayor a 0, reemplaza al calculado.</p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
            <p className="font-medium">Cálculo del límite</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>Sueldo neto: {formatCurrency(preview.netSalary)}</li>
              <li>− Soledad (efectivo): {formatCurrency(preview.soledadCash)}</li>
              <li>= Tras Soledad: {formatCurrency(preview.baseAfterSoledad)}</li>
              <li>− Pagos tarjeta (vencen este mes): {formatCurrency(preview.cardPaymentsDue)}</li>
              <li>= Base para ahorro: {formatCurrency(preview.baseForSavings)}</li>
              <li>
                − Ahorro ({preview.savingsPct.toFixed(1)}%): {formatCurrency(preview.savingsAmount)}
              </li>
              <li className="font-medium text-foreground pt-1">
                Límite calculado (gasto en curso): {formatCurrency(preview.limitFromRule)}
              </li>
              {preview.manualOverride != null && (
                <li className="text-foreground">Usando tope manual: {formatCurrency(preview.manualOverride)}</li>
              )}
              <li className="text-lg font-semibold pt-1">Límite aplicado: {formatCurrency(preview.finalLimit)}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Alertas de presupuesto (gasto en curso)</p>
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
                  <input type="checkbox" {...form.register(name, { valueAsBoolean: true } as never)} />
                  Avisar al {label} del límite
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar configuración"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
