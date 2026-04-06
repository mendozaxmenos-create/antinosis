import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getDefaultUserId } from "@/lib/user";
import { currentMonthYear, formatArs, formatUsd, safeFormatDate, safeFormatMonthYearLabel } from "@/lib/helpers";
import { loadImportsPageData } from "@/lib/imports-page-data";
import { ManualStatementForm } from "@/components/forms/manual-statement-form";
import { StatementUploadForm } from "@/components/forms/statement-upload-form";
import { GoogleCalendarConnect } from "@/components/integrations/google-calendar-connect";
import { StatementImportRowActions } from "@/components/imports/statement-import-row-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";

/** Vercel/Next: tiempo máximo para Server Action de import (PDF + BCRA + Prisma). */
export const maxDuration = 60;

export default async function ImportsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireAdminSession();
  const userId = await getDefaultUserId();
  if (!userId) {
    redirect("/setup");
  }

  const { month, year } = currentMonthYear();

  const calendarParam = typeof searchParams?.calendar === "string" ? searchParams.calendar : undefined;
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  const data = await loadImportsPageData(userId);
  if (!data.ok) {
    if (data.message === "Sesión inválida.") {
      redirect("/setup");
    }
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar Resúmenes</AlertTitle>
          <AlertDescription>{data.message}</AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          Si estás en producción, comprobá <code className="rounded bg-muted px-1">DATABASE_URL</code> en Vercel y que la
          base tenga el esquema actual: <code className="rounded bg-muted px-1">npx prisma db push</code> contra Neon.
        </p>
      </div>
    );
  }

  const { user, imports, reconciliations, cards, loadWarnings } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar resúmenes</h1>
        <p className="text-muted-foreground max-w-3xl">
          Subí un <strong>CSV</strong> o el <strong>PDF</strong> del resumen, o cargá el <strong>total a mano</strong> (p. ej.
          crédito Mercado Pago sin archivo). Se registran movimientos o un único total, alerta de vencimiento y (si conectaste
          Google) un evento en el calendario. Eso <strong>no descuenta del límite de gasto en curso</strong>; el total a pagar
          por vencimiento en el mes sí entra en el panel como los demás resúmenes.
        </p>
      </div>

      {loadWarnings.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Parte de los datos no se pudo cargar</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc text-sm">
              {loadWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">
              Suele indicar que la base de datos en el servidor no tiene el mismo esquema que el código. Ejecutá{" "}
              <code className="rounded bg-muted px-1">npx prisma db push</code> apuntando a la misma URL que usa Vercel.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

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
          <CardTitle>Resumen manual (solo total)</CardTitle>
          <CardDescription>
            Para líneas de crédito o billeteras donde no tenés CSV/PDF: indicás el <strong>total a pagar</strong> del período.
            Se guarda como un movimiento vinculado al resumen y suma al “a pagar” del mes del <strong>vencimiento</strong>,
            igual que un archivo. Podés fijar la <strong>fecha de vencimiento</strong> si no coincide con la tarjeta
            configurada (ej. primeros días del mes).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManualStatementForm userId={userId} cards={cards} defaultMonth={month} defaultYear={year} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subir CSV o PDF</CardTitle>
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
          <CardDescription>
            Archivos procesados. El total en pesos es la suma del equivalente en ARS de cada movimiento: pesos del
            archivo tal cual, más dólares convertidos con la cotización BCRA del día de cada consumo al importar (como
            en el panel). Podés ver y corregir cada línea con el ícono de billetera.
          </CardDescription>
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
                  <TableHead className="text-right">Total a pagar</TableHead>
                  <TableHead>Vencimiento pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Google Cal.</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.bank}</TableCell>
                    <TableCell className="font-mono text-xs">{row.fileName}</TableCell>
                    <TableCell>
                      {safeFormatMonthYearLabel(row.importMonth, row.importYear, "MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right text-sm align-top">
                      <div className="tabular-nums font-medium">{formatArs(row.totalPayableArs)}</div>
                      {row.payableUsdAsArs > 0 ? (
                        <div className="text-xs text-muted-foreground mt-1 max-w-[220px] ml-auto">
                          Incluye {formatUsd(row.payableUsdOriginal)} en USD → {formatArs(row.payableUsdAsArs)} en ARS
                          (tipo BCRA al importar)
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {safeFormatDate(row.paymentDueDate, "d MMM yyyy")}
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
                      {safeFormatDate(row.createdAt, "d MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatementImportRowActions row={row} />
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
                    <TableCell>{safeFormatMonthYearLabel(r.month, r.year, "MMM yyyy")}</TableCell>
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
