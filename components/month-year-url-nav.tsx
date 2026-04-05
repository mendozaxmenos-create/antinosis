"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Label } from "@/components/ui/label";

/**
 * Cambia `?month=&year=` en la URL. Misma idea que el selector de Configuración → Presupuesto.
 */
export function MonthYearUrlNav({
  pathname,
  month,
  year,
  monthLabels,
}: {
  pathname: "/dashboard" | "/expenses" | "/settings";
  month: number;
  year: number;
  monthLabels: { value: number; label: string }[];
}) {
  const router = useRouter();
  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => y - 3 + i);
  }, []);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor={`${pathname}-month`}>Mes</Label>
        <select
          id={`${pathname}-month`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-44"
          value={month}
          onChange={(e) => {
            const m = Number(e.target.value);
            router.push(`${pathname}?month=${m}&year=${year}`);
          }}
        >
          {monthLabels.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${pathname}-year`}>Año</Label>
        <select
          id={`${pathname}-year`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-32"
          value={year}
          onChange={(e) => {
            const y = Number(e.target.value);
            router.push(`${pathname}?month=${month}&year=${y}`);
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
