import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/user";
import { CardForm } from "@/components/forms/card-form";
import { DeleteCardButton } from "@/components/forms/delete-card-button";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard } from "lucide-react";

export default async function CardsPage() {
  const userId = await getDefaultUserId();
  if (!userId) {
    redirect("/setup");
  }

  const cards = await prisma.creditCard.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const noCards = cards.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tarjetas</h1>
        <p className="text-muted-foreground">Alta de tarjetas para importar resúmenes y ver gasto por banco.</p>
      </div>

      {noCards ? (
        <Alert className="border-primary/30 bg-primary/5">
          <CreditCard className="h-4 w-4" />
          <AlertTitle>Primera tarjeta</AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">
            Completá el formulario de abajo con banco, nombre, días de cierre y vencimiento y los últimos cuatro dígitos.
            Sin al menos una tarjeta no vas a poder vincular resúmenes ni usar bien el panel de CuantoQueda con datos de
            plástico.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{noCards ? "Agregar tarjeta" : "Agregar otra tarjeta"}</CardTitle>
          <CardDescription>Banco, nombre, ciclo de facturación y últimos cuatro dígitos.</CardDescription>
        </CardHeader>
        <CardContent>
          <CardForm userId={userId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tus tarjetas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Últimos 4</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead>Venc.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {noCards ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Todavía no hay tarjetas. Usá el formulario de arriba para dar de alta la primera.
                  </TableCell>
                </TableRow>
              ) : null}
              {cards.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.bank}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.brand ?? "—"}</TableCell>
                  <TableCell>{c.last4}</TableCell>
                  <TableCell>{c.closingDay}</TableCell>
                  <TableCell>{c.dueDay}</TableCell>
                  <TableCell>
                    {c.active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteCardButton id={c.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
