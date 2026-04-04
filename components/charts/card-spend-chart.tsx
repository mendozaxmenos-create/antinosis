"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/helpers";

export function CardSpendChart({ data }: { data: { label: string; amount: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No card spend this month.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <YAxis type="category" dataKey="label" width={120} fontSize={11} />
        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 8 }} />
        <Bar dataKey="amount" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
