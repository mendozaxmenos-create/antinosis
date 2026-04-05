# CardSpend — Backlog MVP

Documento vivo: **qué hay hoy** en el repo y **qué falta** para cerrar un MVP usable en producción.

**Última actualización:** abril 2026.

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
| **Stack** | Next.js 14 (App Router), Prisma 5, PostgreSQL (Neon), deploy Vercel |
| **Build** | `prisma generate && next build` — **sin** `db push` en Vercel (esquema se aplica con `npx prisma db push` desde tu PC contra Neon) |
| **Esquema** | Usuario (incl. preferencias de alerta: canal, email, Telegram chat id), tarjetas, categorías, gastos, `MonthlyBudgetConfig` (sueldo neto, Soledad, % ahorro, tope manual, umbrales), importaciones, conciliación, `AlertEvent` |
| **Seed** | Solo categorías (`npm run db:seed`); sin datos de demo |
| **Setup** | `/setup` primer usuario; `db:wipe` / `db:wipe:production` limpia datos de usuario |
| **Git** | `npm run sync:github` — add, commit `chore: sync`, push `main` si hay cambios |

### Funcionalidad de producto

| Módulo | Implementado |
|--------|----------------|
| **Dashboard** | KPIs: neto, Soledad, **pagos tarjeta con vencimiento en el mes** (suma de resúmenes importados), **base para ahorro**, % ahorro, monto ahorro, límite en curso, gasto manual, importado del mes contable, saldo vs límite, histórico ingresos; gauge; categorías/tarjeta; alertas; insights |
| **Configuración** (`/settings`) | Mes/año, sueldo neto, efectivo a Soledad, % ahorro (sobre base ya descontados vencimientos del mes), tope manual, umbrales; **vista previa** con desglose incl. pagos de tarjeta del mes; evolución y tabla histórica (límite coherente con vencimientos); canal de alertas (app / Telegram / email); texto datos en la nube |
| **Cards / Expenses / Reports / Imports** | CRUD y reportes; **alta de gasto con imagen + OCR** (`tesseract.js` en cliente, `lib/parse-receipt-ocr-text.ts`, heurística Mercado Pago); **import resúmenes CSV o PDF** (`pdf-parse` + `parse-brubank-statement.ts` para Brubank; CSV con `parseAmountAr` para montos AR); Google Calendar OAuth en imports |
| **Alertas** | Umbrales (gasto manual vs límite); vencimientos por import; mensajes en español en BD; **replicación** opcional a Telegram (`TELEGRAM_BOT_TOKEN` + chat id) o email (Resend: `RESEND_API_KEY`, `RESEND_FROM`) |
| **Google Calendar** | OAuth, evento de vencimiento al importar si hay token |
| **UI móvil** | Botón **Actualizar** en cabecera (recarga página; no depende del menú del navegador) |

### Telegram (alcance claro)

- **Solo sirve para recibir alertas** (mismo contenido que en el panel): umbrales de presupuesto y avisos de vencimiento de pago cuando corresponda.
- **No** guarda datos ni reemplaza la app: el token del bot va en el servidor; el **chat id** en Configuración.
- Si no configurás Telegram o elegís “Solo en la app”, todo sigue funcionando solo en CardSpend.

### Reglas de negocio

- Límite tarjeta = f(sueldo neto − Soledad − **pagos con vencimiento en el mes calendario**) y % ahorro sobre esa base, salvo tope manual (`lib/calculations.ts`, `services/statementPaymentService.ts`).
- Solo gastos **manuales** cuentan para el tope (`lib/expense-scope.ts`).
- Primer usuario = cuenta activa (`getDefaultUserId`).

### UI

- Navegación: **Configuración**, Dashboard, Cards, Expenses, Reports, Resúmenes; botón recargar junto al logo.
- shadcn + Recharts.

---

## Brechas / deuda (siguen vigentes)

| Tema | Detalle |
|------|---------|
| **Auth** | No hay login: quien tenga la URL puede entrar (salvo capas extra en Vercel). |
| **Single-tenant** | Un solo perfil vía `/setup`; no hay multi-cuenta. |
| **i18n** | Mezcla ES/EN en algunas etiquetas o mensajes legacy. |
| **Moneda** | `formatCurrency` orientado a USD; sin `NEXT_PUBLIC_CURRENCY` / ARS. |
| **Cuotas** | Sin seguimiento por cuota: hoy los movimientos en cuotas no se proyectan mes a mes (importe restante, N de cuota, vencimiento por mes). Ver pendiente P1. |
| **Bonificaciones / reintegros** | En resúmenes suelen aparecer como BONIF, promos o créditos; hoy el import puede ignorarlos. Pendiente: capturarlos y un KPI dedicado (ver P1). |
| **Fidelización (millas / puntos)** | Sin tracking de programas tipo Millas BBVA, Aerolíneas Plus, etc.; pendiente modelo + KPI (ver P1). |
| **Tests** | Sin e2e/unit automatizados. |
| **PDF** | Import de **PDF de resumen Brubank** implementado; otros bancos: CSV o ampliar parsers. |
| **Conciliación** | Modelo y datos; flujo “matched/unmatched” puede profundizarse. |
| **WhatsApp** | No integrado (API Meta/Twilio); documentado en UI. |

---

## Pendiente — priorizado

### P0 — Seguridad y pulido esencial

1. **Proteger el acceso** — Middleware + contraseña en env (`APP_PASSWORD`) o Auth.js / login con Google.
2. **Variables en Vercel** — `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, OAuth Google si aplica; si usás alertas: `TELEGRAM_BOT_TOKEN` y/o Resend; verificar dominio de callback OAuth.
3. **Onboarding vacío** — Tras `/setup`, guiar: primera tarjeta + primera configuración de mes (banners o empty states en dashboard/cards).
4. **Idioma y moneda** — Unificar copy en español (o inglés) y parametrizar moneda/locale para Argentina.

### P1 — Producto

5. **Compras en cuotas** — Vista o apartado que liste compras financiadas: cuotas totales, cuota actual, importe pendiente por mes de vencimiento (alineado al cierre/resumen de la tarjeta). Hoy el import guarda `installments` por defecto en 1; conviene parser por banco + modelo de “plan de cuotas” si hace falta.
6. **Bonificaciones y reintegros en resúmenes** — Campo o entidad para movimientos de crédito del resumen (promociones del banco, BONIF, reintegros por compra). Sirve para **otro KPI**: reintegros del período, “ahorro efectivo” vs consumo bruto, evolución mes a mes. Los parsers hoy suelen descartar importes no positivos; habría que persistirlos aparte o con signo/clarificados.
7. **Programas de fidelización** — Trackear saldos o movimientos de **Millas BBVA**, **Aerolíneas Plus**, u otros programas vinculados a la tarjeta (carga manual o extracto cuando exista). **Otro KPI** en dashboard: puntos/millas del mes, acumulado, vencimientos si aplica.
8. **Import CSV** — Plantilla descargable; validación de columnas; formato por banco (1–2 bancos objetivo).
9. **Categorías** — CRUD en UI (hoy vienen del seed).
10. **PWA** — `manifest.json`, iconos, theme-color para móvil (complementa el botón Actualizar de la cabecera).
11. **Pull-to-refresh** — Gesto de tirar para actualizar en móvil (además del botón en header).
12. **Prisma Migrate** — `migrate deploy` en release o documentación estricta de `db push` manual.

### QA / validación manual (pendiente de confirmar en tu entorno)

- **Import de resumen + Google Calendar** — Probar flujo completo: `GOOGLE_*` + `NEXT_PUBLIC_APP_URL` en `.env` o Vercel; conectar Calendar en **Resúmenes**; subir CSV con movimientos; verificar que en Google Calendar aparezca un **evento de día completo** en la fecha de vencimiento calculada (según día de vencimiento de la tarjeta). Si falla, revisar consentimiento OAuth, redirect URI y logs del deploy.

### P2 — Calidad y escala

13. **Tests** — Cálculos, parsers CSV y OCR, actions críticas.
14. **Observabilidad** — Logs en imports/OAuth; página 500 amigable.
15. **Multi-usuario** — Cuentas reales + aislamiento (datos ya van por `userId`).
16. **Export** — CSV/Excel de gastos por rango.
17. **OCR** — Mejorar precisión o modelo alternativo; más plantillas de comprobantes (bancos, billeteras).

---

## Resumen ejecutivo

| Listo | Pendiente destacado |
|-------|----------------------|
| Ingresos/límites con **vencimientos de tarjeta en el mes**, KPIs, setup, OCR en gastos (imagen), alertas in-app + Telegram/email, CSV, Calendar opcional, botón Actualizar en móvil, deploy sin `db push` en build | **Auth**, moneda/locale, onboarding guiado, **bonificaciones/reintegros y KPI**, **millas/puntos y KPI**, cuotas, categorías editables, PWA/pull-to-refresh, tests, migraciones formales |

---

*Actualizar este archivo al cerrar ítems o cambiar el alcance del MVP.*
