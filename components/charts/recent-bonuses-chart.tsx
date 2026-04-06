"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RecentBonusBarPoint } from "@/lib/analytics-chart-types";
import { formatCurrency } from "@/lib/helpers";

export function RecentBonusesChart({ data }: { data: RecentBonusBarPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Todavía no hay bonos registrados.</p>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" interval={0} angle={-35} textAnchor="end" height={56} />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickFormatter={(v) => formatCurrency(Number(v))}
            width={72}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as RecentBonusBarPoint | undefined;
              if (!row) return null;
              return (
                <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
                  <p className="font-medium">{row.detail}</p>
                  <p className="text-foreground">{formatCurrency(row.amount)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="amount" name="Monto" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
