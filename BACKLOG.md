# CardSpend — Backlog MVP

Documento vivo: **qué hay hoy** en el repo y **qué falta** para cerrar un MVP usable en producción.

**Última actualización:** abril 2026.

**Mantenimiento:** cada vez que cambies comportamiento de producto o parsers, **actualizá en el mismo PR** las secciones *Estado actual* y *Brechas* de este archivo y el **[README](./README.md)** (tabla de funcionalidades, CSV/PDF, reglas). Así la documentación no queda desactualizada.

---

## Alcance del MVP (propuesta)

- Una persona registra tarjetas, define ingresos/límite mensual en tarjeta y carga gastos manuales.
- Ve dashboard con KPIs, avisos de umbral y (opcional) Google Calendar para vencimientos.
- Puede importar movimientos desde **CSV** para registro; opcional alertas por **Telegram** o **email** (Resend).
- **Un solo usuario** por instalación (sin login multi-cuenta en esta fase).

---

## Estado actual — ya implementado

### Infra y datos

| Área | Qué incluye |
|------|-------------|
| **Stack** | Next.js 14 (App Router), Prisma 5, PostgreSQL (Neon), deploy Vercel; **middleware** opcional con `APP_PASSWORD` (`/login`, cookie); **`NEXT_PUBLIC_LOCALE`** / **`NEXT_PUBLIC_CURRENCY`** (default `es-AR` / `ARS`) para `formatCurrency` y `<html lang>` |
| **Build** | `scripts/vercel-build.js`: en **Vercel** corre `prisma db push` + `generate` + `next build`; en local solo `generate` + `next build`. `DATABASE_URL` obligatoria en Vercel para el push. |
| **Esquema** | Usuario (alertas: canal, email, Telegram; OAuth Google Calendar), tarjetas, categorías, gastos (incl. `statementImportId` opcional hacia `StatementImport`), `MonthlyBudgetConfig`, `SalaryBonus` (bonos de sueldo por mes/año), `StatementImport` (vencimiento, evento Calendar), conciliación, `AlertEvent` |
| **Seed** | Solo categorías (`npm run db:seed`); sin datos de demo |
| **Setup** | `/setup` primer usuario; `db:wipe` / `db:wipe:production` limpia datos de usuario |
| **Git** | `npm run sync:github` — add, commit `chore: sync`, push `main` si hay cambios |

### Funcionalidad de producto

| Módulo | Implementado |
|--------|----------------|
| **CuantoQueda** (`/dashboard`) | Selector de mes (`?month=&year=`). **Onboarding:** alertas si no hay tarjetas cargadas o si falta **sueldo neto** del mes seleccionado (enlaces a Cards y Configuración). Tarjeta principal **saldo disponible** (tope − gasto manual); KPIs: neto, Soledad, base (neto−Soledad), % ahorro, ahorro estimado, tope, gasto manual; bloque **referencia** (total a pagar por resúmenes con vencimiento en el mes, importado del mes contable — **no restan del tope**); gauge; categorías/tarjeta; alertas; insights |
| **Configuración** (`/settings`) | Mes/año, sueldo neto (manual, editable), Soledad, % ahorro sobre *(neto − Soledad)*, tope manual, umbrales; vista previa **sin** restar resúmenes del tope; total resúmenes del mes como referencia; **bonos de sueldo** (registro por mes con monto y nota opcional; suma por mes); **evolución del sueldo** con dos series (neto guardado vs bonos del mes) y tooltip con total; tabla histórica; alertas (app / Telegram / email) |
| **Cards / Expenses / Reports / Imports** | **Cards:** UI en español; alerta y tabla vacía si aún no hay tarjetas. CRUD y reportes; **alta de gasto con imagen + OCR** (`tesseract.js`, `lib/parse-receipt-ocr-text.ts`); **import CSV o PDF**: `parse-statement-import.ts` encadena CSV genérico (USD/BCRA si aplica), PDF **Brubank**, **BBVA**, **Banco Nación MC** (`parse-brubank-statement`, `parse-bbva-statement`, `parse-banco-nacion-mc-statement`); vistas por mes usan **fecha de operación** (`transactionDate`, `lib/month-transaction-filter.ts`); **Google Calendar** OAuth en imports; **`/imports`** con `error.tsx` si falla la carga |
| **Alertas** | Umbrales (gasto manual vs límite); vencimientos por import; mensajes en español en BD; **replicación** opcional a Telegram (`TELEGRAM_BOT_TOKEN` + chat id) o email (Resend: `RESEND_API_KEY`, `RESEND_FROM`) |
| **Google Calendar** | OAuth, evento de vencimiento al importar si hay token |
| **Acceso (opcional)** | Si definís **`APP_PASSWORD`** en el servidor: **middleware** redirige a `/login`; cookie httpOnly (30 días); **logout** de sesión de acceso en esa página. Sin variable, la app sigue accesible solo con la URL (como antes). Compatible con OAuth de Calendar. |
| **UI móvil** | Botón **Actualizar** en cabecera (recarga página; no depende del menú del navegador) |

### Telegram (alcance claro)

- **Solo sirve para recibir alertas** (mismo contenido que en el panel): umbrales de presupuesto y avisos de vencimiento de pago cuando corresponda.
- **No** guarda datos ni reemplaza la app: el token del bot va en el servidor; el **chat id** en Configuración.
- Si no configurás Telegram o elegís “Solo en la app”, todo sigue funcionando solo en CardSpend.

### Reglas de negocio

- **Tope gasto manual (CuantoQueda)** = f(sueldo neto − Soledad) y % ahorro sobre esa base, salvo tope manual (`lib/calculations.ts`). Los **pagos por resúmenes** (vencimiento en el mes) **no** restan del tope; se muestran como referencia (`services/statementPaymentService.ts`).
- Solo gastos **manuales** cuentan para el tope (`lib/expense-scope.ts`).
- Los **importados** se filtran por **fecha de operación** en el mes calendario (no por el mes elegido al subir el archivo).
- Primer usuario = cuenta activa (`getDefaultUserId`).

### UI

- Navegación: **Configuración**, **CuantoQueda** (antes “Dashboard”), Cards, Expenses, Reports, Resúmenes; botón recargar junto al logo.
- shadcn + Recharts.

---

## Brechas / deuda (siguen vigentes)

| Tema | Detalle |
|------|---------|
| **Auth por usuario** | La **puerta global** con `APP_PASSWORD` + `/login` + cookie ya está implementada (ver *Estado actual*). **Pendiente:** login por **cuenta** (no solo instalación), roles **admin**, Auth.js u OAuth Google por usuario (ver P0). |
| **Admin / métricas de producto** | No existe **dashboard de operaciones** para el dueño de la app: usuarios activos, en **modo prueba** / trial, **canon o ingreso mensual** (suscripción), u otras métricas al salir al público. Sin **rol admin** ni acceso dedicado desde la UI del cliente (ver P0 ítems 2–4). |
| **Single-tenant** | Un solo perfil vía `/setup`; no hay multi-cuenta. |
| **i18n** | La navegación principal y metadatos por defecto en **español**; puede quedar **inglés residual** en alguna pantalla o componente (revisión fina pendiente). |
| **Moneda** | **Resuelto en código:** `formatCurrency` usa `NEXT_PUBLIC_CURRENCY` + `NEXT_PUBLIC_LOCALE` (por defecto ARS / es-AR). `formatUsd` sigue para montos explícitos en dólares en importaciones. |
| **Bonos de sueldo vs CuantoQueda** | Los **bonos** registrados en Configuración suman en la **evolución** (neto + bonos por mes) y en la tabla de bonos; **no** modifican el tope de gasto manual ni los KPI principales del dashboard (solo el sueldo neto guardado). Opcional futuro: reflejar bonos en ingreso de referencia del mes en `/dashboard`. |
| **Import de resúmenes: aprobación y categorías** | Hoy el import crea gastos automáticamente con categorización heurística (o cae a “Other”). Falta un flujo de **preview + aprobación** donde **todas** las líneas queden asociadas a una categoría antes de confirmar, y un mecanismo de “aprendizaje” por comercio/descripcion para mejorar sugerencias futuras. |
| **Cuotas** | Sin seguimiento por cuota: `Expense.installments` existe, pero en importación hoy se guarda **siempre 1** y no se proyectan cuotas a meses siguientes. Pendiente: detectar X/Y cuando aparezca en el texto y **imputar** automáticamente a los meses siguientes + KPI (ver P1). |
| **Adicionales de tarjeta** | Sin datos de titulares adicionales en el alta/edición de tarjeta; el import no asocia consumos a un adicional; dashboard sin KPI por adicional (ver P1). |
| **Bonificaciones / reintegros** | En resúmenes suelen aparecer como BONIF, promos o créditos; hoy el import puede ignorarlos. Pendiente: capturarlos y un KPI dedicado (ver P1). |
| **Fidelización (millas / puntos)** | Sin tracking de programas tipo Millas BBVA, Aerolíneas Plus, etc.; pendiente modelo + KPI (ver P1). |
| **Google Calendar y resúmenes** | Ya se intenta crear un evento de vencimiento al importar si hay OAuth; falta cerrar el comportamiento deseado de punta a punta (feedback, duplicados, fallos). Ver P1. |
| **Tests** | Sin e2e/unit automatizados. |
| **PDF** | Parsers de texto para **Brubank**, **BBVA**, **Banco Nación (MC/Nativa)**; otros bancos: **CSV** o nuevos parsers según formato. **Vercel:** worker de pdfjs resuelto con `PDFParse.setWorker(file://…)` + `experimental.serverComponentsExternalPackages` — ver [Nota: PDF en serverless](#nota-pdf-en-serverless-vercel). |
| **Conciliación** | Modelo y datos; flujo “matched/unmatched” puede profundizarse. |
| **WhatsApp** | No integrado (API Meta/Twilio); documentado en UI. |

---

## Nota: PDF en serverless (Vercel)

**Síntoma resuelto (abr 2026):** al subir un PDF en producción aparecía `Setting up fake worker failed` con `Cannot find module '.../.next/server/chunks/pdf.worker.mjs'`.

**Causa:** en Node, pdf.js usa un “fake worker” que hace `import(workerSrc)`; el default `./pdf.worker.mjs` lo reescribía Webpack a un chunk que no existe en `/var/task`.

**Implementación:** `PDFParse.setWorker()` con URL `file://` a `node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs` (`lib/pdf-worker-path.ts`), llamado antes de `new PDFParse`, y `experimental.serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"]` en `next.config.mjs` para no forzar el bundle incorrecto del worker.

**Vercel (abr 2026):** el trace de archivos del serverless no incluía `pdf.worker.mjs` ni todo `pdfjs-dist` (el `import()` del fake worker no se ve en el análisis estático). Se añadió `experimental.outputFileTracingIncludes` con `./node_modules/pdfjs-dist/**/*` y `./node_modules/@napi-rs/canvas/**/*` (clave `"**"` para que aplique a las rutas server). Dependencia directa `pdfjs-dist@5.4.296` en `package.json` alineada a `pdf-parse`.

**Relacionado:** polyfills DOM (`lib/pdf-node-polyfills.ts`), import dinámico de `pdf-parse` en `statementFileToText` (`app/actions.ts`).

---

## Pendiente — priorizado

### P0 — Seguridad y pulido esencial

1. **Variables en Vercel** — **Hecho:** checklist en `/settings` que indica si están configuradas (sin mostrar valores). Verificar en deploy: `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, OAuth Google si aplica; si usás alertas: `TELEGRAM_BOT_TOKEN` y/o Resend; si usás **puerta de acceso**, definir también **`APP_PASSWORD`**; opcional **`NEXT_PUBLIC_LOCALE`** / **`NEXT_PUBLIC_CURRENCY`**.
2. **Contraseña y rol admin (cuenta propietario)** — **Hecho (OAuth admin):** login con Google/Microsoft (NextAuth/Auth.js) + allowlist `ADMIN_EMAILS`. Cuando está configurado, **reemplaza** el gate `APP_PASSWORD` (pasa a modo legacy).
3. **Dashboard de operaciones (métricas de la app)** — Para el **lanzamiento al público general**: vista protegida solo para admin con **métricas de negocio** — p. ej. **cantidad de usuarios activos**, usuarios en **modo prueba** / trial, **canon o ingreso mensual** recurrente (MRR), y otras KPIs que definas (registros, churn, uso). Depende de modelo de datos multi-usuario / suscripción y de instrumentación.
4. **Acceso al panel admin desde la app cliente** — En el **dashboard del cliente** (p. ej. CuantoQueda / layout principal), un acceso explícito para quien sea admin: **“Ver panel de administración”** o **modo admin**, que lleve al dashboard de métricas (ítem 3) sin confundirlo con el flujo normal de gastos y presupuesto.

### P1 — Producto

5. **Compras en cuotas (proyección automática)** — Detectar cuotas (X/Y) al importar resúmenes y **proyectar** el consumo a meses siguientes según cuotas restantes. Incluye:
   - Persistir `installments` real en gastos importados (hoy queda en 1 fijo).
   - Estrategia de imputación: materializar movimientos futuros “cuota N” o calcular una vista agregada (definir qué preferís).
   - Leyenda visible: “Importado (cuotas)” en los meses futuros.
   - KPI mensual: **total ARS en cuotas imputadas** en el mes (y que se sume a consumos de meses próximos).
6. **Bonificaciones y reintegros en resúmenes** — Campo o entidad para movimientos de crédito del resumen (promociones del banco, BONIF, reintegros por compra). Sirve para **otro KPI**: reintegros del período, “ahorro efectivo” vs consumo bruto, evolución mes a mes. Los parsers hoy suelen descartar importes no positivos; habría que persistirlos aparte o con signo/clarificados.
7. **Programas de fidelización** — Trackear saldos o movimientos de **Millas BBVA**, **Aerolíneas Plus**, u otros programas vinculados a la tarjeta (carga manual o extracto cuando exista). **Otro KPI** en dashboard: puntos/millas del mes, acumulado, vencimientos si aplica.
8. **Google Calendar al subir un resumen** — Que cada importación de resumen (CSV/PDF) **registre el vencimiento de pago** en el Google Calendar del usuario cuando tenga cuenta OAuth vinculada. Incluye: comportamiento claro si no hay token, si la API falla, evitar duplicados al reimportar, texto/título del evento (tarjeta, importe a pagar si aplica) y validación en todos los parsers.
9. **Import CSV** — Plantilla descargable; validación de columnas; formato por banco (1–2 bancos objetivo).
10. **Categorías** — CRUD en UI (hoy vienen del seed).
11. **Gráficos de evolución (ingresos vs tarjeta / bonos / resúmenes)** — Agregar gráficos para analizar tendencias:
   - **Bonos**: gráfico con los últimos bonos cargados (y/o bonos por mes).
   - **Resúmenes**: gráfico de resúmenes subidos por mes (cantidad y total ARS).
   - **Comparación**: evolución mensual de ingresos (neto o neto+bonos) vs gastos con tarjeta (importados).
12. **Importación con revisión y aprendizaje de categorías** — Antes de “confirmar” un resumen:
   - Preview (parse + USD→ARS) con sugerencia de categoría.
   - UI para revisar consumos y **obligar** categoría en cada línea antes de aprobar.
   - Guardar reglas aprendidas (merchant/descripcion → categoría) para mejorar sugerencias futuras.
   - Opcional: fallback OCR si el PDF es escaneado y no se puede parsear por texto.
13. **PWA** — `manifest.json`, iconos, theme-color para móvil (complementa el botón Actualizar de la cabecera).
14. **Pull-to-refresh** — Gesto de tirar para actualizar en móvil (además del botón en header).
15. **Prisma Migrate** — Opcional: pasar de `db push` en deploy a **migraciones versionadas** (`migrate deploy`) para equipos más grandes; hoy el esquema se aplica en cada build de Vercel.
16. **Adicionales de tarjeta (titulares adicionales)** — En **alta y edición de tarjeta**, permitir registrar uno o más **adicionales** (nombre o etiqueta que figure en el resumen). En **importación de consumos** (CSV/PDF u OCR), **detectar** a qué adicional corresponde cada movimiento según texto del comercio/descripción o patrones del banco, y guardar la asociación. **Dashboard:** al menos un **KPI** agregado (p. ej. gasto del mes por adicional, o comparación titular vs adicionales) coherente con el filtro de mes calendario ya usado en la app.

### QA / validación manual (pendiente de confirmar en tu entorno)

- **Import de resumen + Google Calendar** — Probar flujo completo: `GOOGLE_*` + `NEXT_PUBLIC_APP_URL` en `.env` o Vercel; conectar Calendar en **Resúmenes**; subir CSV o PDF; verificar que en Google Calendar aparezca un **evento de día completo** en la fecha de vencimiento calculada (según día de vencimiento de la tarjeta). Objetivo de producto (ver P1 ítem 8): que esto sea el comportamiento estable y visible para el usuario. Si falla, revisar consentimiento OAuth, redirect URI y logs del deploy.

### P2 — Calidad y escala

17. **Tests** — Cálculos, parsers CSV y OCR, actions críticas.
18. **Observabilidad** — Logs en imports/OAuth; páginas de error amigables (p. ej. `/imports` tiene `error.tsx`); revisar resto de rutas.
19. **Multi-usuario** — Cuentas reales + aislamiento (datos ya van por `userId`).
20. **Export** — CSV/Excel de gastos por rango.
21. **OCR** — Mejorar precisión o modelo alternativo; más plantillas de comprobantes (bancos, billeteras).

---

## Resumen ejecutivo

| Listo | Pendiente destacado |
|-------|----------------------|
| Ingresos/límites con **vencimientos de tarjeta en el mes**, **bonos de sueldo + evolución neto/bonos en Configuración**, **puerta opcional `APP_PASSWORD`** (`/login`, cookie), **onboarding** en CuantoQueda y Cards (alertas / vacíos), **locale/moneda** (`es-AR` / `ARS` por defecto), KPIs, setup, OCR en gastos (imagen), alertas in-app + Telegram/email, CSV, Calendar opcional, botón Actualizar en móvil, deploy sin `db push` en build | **Auth por usuario** + **admin** (contraseña, rol), **dashboard de operaciones** (usuarios activos, trial, canon/MRR) y **acceso admin desde la app**; **Calendar al importar resumen**; **import con aprobación** (categorías obligatorias + aprendizaje); **gráficos** (bonos, resúmenes, ingresos vs tarjeta); cuotas proyectadas; PWA/pull-to-refresh; tests; migraciones |

---

*Actualizar este archivo y el README al cerrar ítems, cambiar el alcance del MVP o modificar imports/parsers/reglas de negocio.*
