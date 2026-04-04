import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/user";
import { currentMonthYear } from "@/lib/helpers";
import { format } from "date-fns";
import { StatementUploadForm } from "@/components/forms/statement-upload-form";
import { GoogleCalendarConnect } from "@/components/integrations/google-calendar-connect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function ImportsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const userId = await getDefaultUserId();
  if (!userId) {
    return <p className="text-muted-foreground">Ejecutá el seed de la base primero.</p>;
  }

  const { month, year } = currentMonthYear();

  const calendarParam = typeof searchParams?.calendar === "string" ? searchParams.calendar : undefined;
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  const [user, imports, reconciliations, cards] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { googleRefreshToken: true, googleCalendarEmail: true },
    }),
    prisma.statementImport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { card: true },
    }),
    prisma.reconciliationResult.findMany({
      where: { userId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
    }),
    prisma.creditCard.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar resúmenes</h1>
        <p className="text-muted-foreground max-w-3xl">
          Subí un CSV del resumen: se registran movimientos categorizados y (si conectaste Google) un evento de
          vencimiento. Eso <strong>no descuenta del límite mensual</strong>: el límite es solo para el gasto en curso que
          cargás a mano. Después podemos refinar conciliación y comprobantes.
        </p>
      </div>

      {calendarParam === "connected" ? (
        <Alert>
          <AlertTitle>Google Calendar listo</AlertTitle>
          <AlertDescription>
            La próxima vez que importes un resumen, se creará un evento el día del vencimiento de pago.
          </AlertDescription>
        </Alert>
      ) : null}
      {calendarParam === "no_refresh" ? (
        <Alert variant="destructive">
          <AlertTitle>No se obtuvo permiso permanente</AlertTitle>
          <AlertDescription>
            Volvé a conectar y asegurate de aceptar el acceso (a veces Google no devuelve refresh token si ya autorizaste
            antes; probá revocar el acceso en tu cuenta de Google y volver a conectar).
          </AlertDescription>
        </Alert>
      ) : null}
      {calendarParam && calendarParam !== "connected" && calendarParam !== "no_refresh" ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo conectar el calendario</AlertTitle>
          <AlertDescription>Código: {calendarParam}</AlertDescription>
        </Alert>
      ) : null}

      <GoogleCalendarConnect
        userId={userId}
        connected={!!user.googleRefreshToken}
        email={user.googleCalendarEmail}
        configured={googleConfigured}
      />

      <Card>
        <CardHeader>
          <CardTitle>Subir CSV</CardTitle>
          <CardDescription>
            El límite en Presupuesto aplica solo a cargas <strong>manuales</strong> (gasto en curso). Lo importado acá es
            registro + calendario, no resta del tope.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatementUploadForm userId={userId} cards={cards} defaultMonth={month} defaultYear={year} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de importaciones</CardTitle>
          <CardDescription>Archivos procesados</CardDescription>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no importaste resúmenes.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Vencimiento pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Google Cal.</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.bank}</TableCell>
                    <TableCell className="font-mono text-xs">{row.fileName}</TableCell>
                    <TableCell>
                      {format(new Date(row.importYear, row.importMonth - 1, 1), "MMM yyyy")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {row.paymentDueDate
                        ? format(row.paymentDueDate, "d MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.googleCalendarEventId ? (
                        <Badge variant="secondary">Creado</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {format(row.createdAt, "d MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados de conciliación</CardTitle>
          <CardDescription>Conteos por mes (para la fase siguiente)</CardDescription>
        </CardHeader>
        <CardContent>
          {reconciliations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin ejecuciones de conciliación.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-right">Coincidencias</TableHead>
                  <TableHead className="text-right">Manual sin match</TableHead>
                  <TableHead className="text-right">Importado sin match</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.year, r.month - 1, 1), "MMM yyyy")}</TableCell>
                    <TableCell className="text-right">{r.matchedCount}</TableCell>
                    <TableCell className="text-right">{r.unmatchedManualCount}</TableCell>
                    <TableCell className="text-right">{r.unmatchedImportedCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
