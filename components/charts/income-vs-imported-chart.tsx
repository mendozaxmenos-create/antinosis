"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IncomeVsImportedPoint } from "@/lib/analytics-chart-types";
import { formatCurrency } from "@/lib/helpers";

export function IncomeVsImportedChart({ data }: { data: IncomeVsImportedPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Necesitás al menos un mes con ingresos o movimientos importados para comparar.
      </p>
    );
  }

  const hasAny = data.some((d) => d.totalIncome > 0 || d.importedCardSpending > 0);
  if (!hasAny) {
    return (
      <p className="text-sm text-muted-foreground">
        Cargá sueldos/bonos o importá resúmenes para ver la comparación mensual.
      </p>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickFormatter={(v) => formatCurrency(Number(v))}
            width={72}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as IncomeVsImportedPoint | undefined;
              if (!row) return null;
              return (
                <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
                  <p className="font-medium">{label}</p>
                  <p className="text-muted-foreground">
                    Ingreso (neto + bonos):{" "}
                    <span className="text-foreground">{formatCurrency(row.totalIncome)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Gasto importado (resúmenes, mes operación):{" "}
                    <span className="text-foreground">{formatCurrency(row.importedCardSpending)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="totalIncome"
            name="Ingreso del mes (neto + bonos)"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot
          />
          <Line
            type="monotone"
            dataKey="importedCardSpending"
            name="Importado tarjeta (mes operación)"
            stroke="hsl(var(--chart-4))"
            strokeWidth={2}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
