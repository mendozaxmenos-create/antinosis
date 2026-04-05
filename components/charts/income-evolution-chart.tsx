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
import type { IncomeEvolutionPoint } from "@/lib/income-evolution-types";
import { formatCurrency } from "@/lib/helpers";

export function IncomeEvolutionChart({
  data,
  totalLabel,
}: {
  data: IncomeEvolutionPoint[];
  totalLabel: string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cargá sueldos netos por mes o registrá bonos para ver la evolución.
      </p>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <p className="mb-2 text-sm text-muted-foreground">{totalLabel}</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickFormatter={(v) => formatCurrency(Number(v))}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as IncomeEvolutionPoint | undefined;
              if (!row) return null;
              return (
                <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
                  <p className="font-medium">{label}</p>
                  <p className="text-muted-foreground">
                    Sueldo neto: <span className="text-foreground">{formatCurrency(row.netIncome)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Bonos (mes): <span className="text-foreground">{formatCurrency(row.bonus)}</span>
                  </p>
                  <p className="mt-1 border-t pt-1 font-medium text-foreground">
                    Total: {formatCurrency(row.total)}
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="netIncome"
            name="Sueldo neto"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot
          />
          <Line
            type="monotone"
            dataKey="bonus"
            name="Bonos (suma del mes)"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
