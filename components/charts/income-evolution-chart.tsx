"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/helpers";

export type IncomePoint = { key: string; label: string; income: number };

export function IncomeEvolutionChart({ data, totalLabel }: { data: IncomePoint[]; totalLabel: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Cargá sueldos netos por mes para ver la evolución.</p>;
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
            formatter={(value: number) => [formatCurrency(value), "Sueldo neto"]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
          />
          <Line type="monotone" dataKey="income" stroke="hsl(var(--primary))" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
