"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/helpers";
import type { MonthSummary } from "@/lib/calculations";

export function MonthComparisonChart({ rows }: { rows: MonthSummary[] }) {
  const data = rows.map((r) => ({
    name: `${r.month}/${r.year}`,
    budget: r.budget,
    spent: r.spent,
  }));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay historial.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{ borderRadius: 8 }}
        />
        <Legend />
        <Bar dataKey="budget" name="Presupuesto" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spent" name="Gasto en curso" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
