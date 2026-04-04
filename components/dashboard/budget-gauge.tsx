"use client";

import { Progress } from "@/components/ui/progress";
import { gaugeBandFromPercent, gaugeIndicatorClass } from "@/lib/calculations";
import { formatCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";

export function BudgetGauge({
  budget,
  spent,
  percentConsumed,
  importedTotal = 0,
}: {
  budget: number;
  spent: number;
  percentConsumed: number;
  /** Total desde resúmenes CSV; informativo, no suma al % */
  importedTotal?: number;
}) {
  const band = gaugeBandFromPercent(percentConsumed);
  const barPct = Math.min(100, percentConsumed);
  const indicatorClass = gaugeIndicatorClass(band);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Uso del límite (gasto en curso)</p>
          <p className="text-3xl font-semibold tracking-tight">{percentConsumed.toFixed(1)}%</p>
        </div>
        <p className="text-right text-sm text-muted-foreground">
          {formatCurrency(spent)} de {formatCurrency(budget)}
        </p>
      </div>
      <Progress value={barPct} indicatorClassName={cn(indicatorClass)} className="h-3" />
      {importedTotal > 0 ? (
        <p className="text-xs text-muted-foreground">
          Importado desde resúmenes: <strong>{formatCurrency(importedTotal)}</strong> (no descuenta del límite; el cierre
          suele ser mayor que tu tope).
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> 0–59% OK
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> 60–79%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> 80–99%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-600" /> 100%+
        </span>
      </div>
    </div>
  );
}
