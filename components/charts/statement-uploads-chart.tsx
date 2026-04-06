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
import type { StatementUploadMonthPoint } from "@/lib/analytics-chart-types";
import { formatCurrency } from "@/lib/helpers";

export function StatementUploadsChart({ data }: { data: StatementUploadMonthPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no subiste resúmenes en el período mostrado.
      </p>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
              const row = payload[0]?.payload as StatementUploadMonthPoint | undefined;
              if (!row) return null;
              return (
                <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
                  <p className="font-medium">{label}</p>
                  <p className="text-muted-foreground">
                    Resúmenes subidos: <span className="text-foreground">{row.uploadCount}</span>
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    Suma importada: {formatCurrency(row.totalImportedArs)}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="totalImportedArs"
            name="Total movimientos (ARS)"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
