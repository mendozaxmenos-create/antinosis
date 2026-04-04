import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/user";
import { CardForm } from "@/components/forms/card-form";
import { DeleteCardButton } from "@/components/forms/delete-card-button";

export default async function CardsPage() {
  const userId = await getDefaultUserId();
  if (!userId) {
    return <p className="text-muted-foreground">Run database seed first.</p>;
  }

  const cards = await prisma.creditCard.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Credit cards</h1>
        <p className="text-muted-foreground">Manage cards used for monthly tracking.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a card</CardTitle>
          <CardDescription>Bank, nickname, billing cycle days, and last four digits.</CardDescription>
        </CardHeader>
        <CardContent>
          <CardForm userId={userId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your cards</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Last 4</TableHead>
                <TableHead>Closing</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
