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
| **Dashboard** | KPIs (neto, Soledad, ahorro, límite, gastos, importado, histórico ingresos), gauge, categorías/tarjeta, alertas, insights |
| **Configuración** (`/settings`) | Mes/año, sueldo neto, efectivo a Soledad, % ahorro, tope manual, umbrales; evolución y tabla histórica de ingresos; canal de alertas (app / Telegram / email); texto datos en la nube |
| **Cards / Expenses / Reports / Imports** | CRUD y reportes como antes; import CSV; Google Calendar OAuth en imports |
| **Alertas** | Umbrales (gasto manual vs límite); vencimientos por import; mensajes en español en BD; **replicación** opcional a Telegram (`TELEGRAM_BOT_TOKEN` + chat id) o email (Resend: `RESEND_API_KEY`, `RESEND_FROM`) |
| **Google Calendar** | OAuth, evento de vencimiento al importar si hay token |

### Telegram (alcance claro)

- **Solo sirve para recibir alertas** (mismo contenido que en el panel): umbrales de presupuesto y avisos de vencimiento de pago cuando corresponda.
- **No** guarda datos ni reemplaza la app: el token del bot va en el servidor; el **chat id** en Configuración.
- Si no configurás Telegram o elegís “Solo en la app”, todo sigue funcionando solo en CardSpend.

### Reglas de negocio

- Límite tarjeta = f(sueldo neto − Soledad) y % ahorro, salvo tope manual (`lib/calculations.ts`).
- Solo gastos **manuales** cuentan para el tope (`lib/expense-scope.ts`).
- Primer usuario = cuenta activa (`getDefaultUserId`).

### UI

- Navegación: **Configuración** (antes Budget), Dashboard, Cards, Expenses, Reports, Resúmenes.
- shadcn + Recharts.

---

## Brechas / deuda (siguen vigentes)

| Tema | Detalle |
|------|---------|
| **Auth** | No hay login: quien tenga la URL puede entrar (salvo capas extra en Vercel). |
| **Single-tenant** | Un solo perfil vía `/setup`; no hay multi-cuenta. |
| **i18n** | Mezcla ES/EN en algunas etiquetas o mensajes legacy. |
| **Moneda** | `formatCurrency` orientado a USD; sin `NEXT_PUBLIC_CURRENCY` / ARS. |
| **Tests** | Sin e2e/unit automatizados. |
| **PDF** | No hay import de PDF de resumen; solo CSV. |
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

5. **Import CSV** — Plantilla descargable; validación de columnas; formato por banco (1–2 bancos objetivo).
6. **Categorías** — CRUD en UI (hoy vienen del seed).
7. **PWA** — `manifest.json`, iconos, theme-color para móvil.
8. **Prisma Migrate** — `migrate deploy` en release o documentación estricta de `db push` manual.

### QA / validación manual (pendiente de confirmar en tu entorno)

- **Import de resumen + Google Calendar** — Probar flujo completo: `GOOGLE_*` + `NEXT_PUBLIC_APP_URL` en `.env` o Vercel; conectar Calendar en **Resúmenes**; subir CSV con movimientos; verificar que en Google Calendar aparezca un **evento de día completo** en la fecha de vencimiento calculada (según día de vencimiento de la tarjeta). Si falla, revisar consentimiento OAuth, redirect URI y logs del deploy.

### P2 — Calidad y escala

9. **Tests** — Cálculos, parser CSV, actions críticas.
10. **Observabilidad** — Logs en imports/OAuth; página 500 amigable.
11. **Multi-usuario** — Cuentas reales + aislamiento (datos ya van por `userId`).
12. **Export** — CSV/Excel de gastos por rango.

---

## Resumen ejecutivo

| Listo | Pendiente destacado |
|-------|----------------------|
| Ingresos/límites, KPIs, setup, alertas in-app + Telegram/email, CSV, Calendar opcional, deploy sin `db push` en build | **Auth**, moneda/locale, onboarding guiado, categorías editables, tests, migraciones formales |

---

*Actualizar este archivo al cerrar ítems o cambiar el alcance del MVP.*
