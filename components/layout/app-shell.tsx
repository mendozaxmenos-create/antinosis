"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  PieChart,
  Receipt,
  RefreshCw,
  Settings,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "CuantoQueda", icon: LayoutDashboard },
  { href: "/settings", label: "Configuración", icon: Settings },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports", icon: PieChart },
  { href: "/imports", label: "Resúmenes", icon: Upload },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSetup = pathname === "/setup";
  const isLogin = pathname === "/login";
  const minimalChrome = isSetup || isLogin;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href={isSetup ? "/setup" : isLogin ? "/login" : "/dashboard"}
              className="flex min-w-0 items-center gap-2 font-semibold tracking-tight"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">
                CC
              </span>
              <span className="hidden sm:inline">CardSpend</span>
            </Link>
            {!minimalChrome ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 touch-manipulation sm:h-10 sm:w-10"
                aria-label="Actualizar página"
                title="Recargar datos (útil en el celular)"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
          </div>
          <nav className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1 sm:gap-2">
            {!minimalChrome &&
              nav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  title={href === "/settings" ? "Configuración: ingresos, límites y alertas" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
