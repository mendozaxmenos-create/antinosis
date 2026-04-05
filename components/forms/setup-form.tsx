"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFirstUserAction } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const schema = z.object({
  name: z.string().trim().min(1, "Escribí tu nombre").max(120),
});

type FormValues = z.infer<typeof schema>;

export function SetupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "" } });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const res = await createFirstUserAction(values);
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      form.setError("root", { message: res.error });
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Empezá con CardSpend</CardTitle>
        <CardDescription>
          Un solo perfil en esta instalación. Podés cargar tarjetas, presupuesto y gastos después.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tu nombre</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Ej. Ana"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Guardando…" : "Continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
