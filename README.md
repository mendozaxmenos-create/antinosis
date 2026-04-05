# CardSpend

Aplicación web para **controlar gasto con tarjeta de crédito**: presupuesto a partir de **sueldo neto**, transferencias, **pagos de tarjeta con vencimiento en el mes** (según resúmenes importados), % de ahorro, seguimiento **en curso** (cargas manuales), **importación de capturas** (OCR en el navegador) al cargar un gasto, importación de **resúmenes CSV**, alertas por umbrales y vencimientos, informes e integraciones opcionales (**Google Calendar**, **Telegram**, **email**).

> El paquete npm se llama `antinosis`; en la UI la app se muestra como **CardSpend**.

---

## Tabla de contenidos

1. [Funcionalidades](#funcionalidades)  
2. [Stack](#stack)  
3. [Requisitos e instalación](#requisitos-e-instalación)  
4. [Variables de entorno](#variables-de-entorno)  
5. [Scripts npm](#scripts-npm)  
6. [Deploy (Vercel)](#deploy-vercel)  
7. [Integraciones opcionales](#integraciones-opcionales)  
8. [Flujo de uso](#flujo-de-uso)  
9. [Reglas de negocio](#reglas-de-negocio)  
10. [Estructura del repo](#estructura-del-repo)  
11. [Backlog y pendientes](#backlog-y-pendientes)  
12. [Licencia](#licencia)

---

## Funcionalidades

### Core

| Área | Qué incluye |
|------|-------------|
| **Primer uso** | Ruta `/setup`: creás el único perfil de la instalación (un usuario por base de datos). |
| **Configuración** (`/settings`) | Por mes/año: **sueldo neto**, **efectivo a Soledad**, **% de ahorro** sobre el disponible, **tope manual** opcional en tarjeta, umbrales de alerta (60–100 %). Evolución del sueldo neto (gráfico + tabla histórica). |
| **Dashboard** | KPIs (neto, Soledad, ahorro, límite, gasto manual, importado, saldo vs límite, suma de ingresos históricos), gauge, gasto por categoría/tarjeta, alertas, insights. |
| **Tarjetas** (`/cards`) | Alta/edición/baja: banco, nombre, marca, últimos 4, días de cierre y vencimiento. |
| **Gastos** (`/expenses`) | Movimientos **manuales** que cuentan para el límite del mes. |
| **Informes** (`/reports`) | Comparativas mensuales, torta por categoría, gasto por tarjeta. |
| **Resúmenes** (`/imports`) | Importación **CSV** con parser flexible; categorización heurística; alerta de **vencimiento de pago**; opcional evento en **Google Calendar**. |

### Alertas y canales

- **En la app**: siempre en el panel y en la lista de alertas.
- **Telegram** (opcional): mismas alertas por bot; requiere `TELEGRAM_BOT_TOKEN` en el servidor y **chat id** en Configuración. **No** sustituye la app ni guarda datos fuera de tu base.
- **Email** (opcional): vía [Resend](https://resend.com) (`RESEND_API_KEY`, `RESEND_FROM` verificado).
- **WhatsApp**: no integrado (API Meta/Twilio); explicado en la UI.

### Integraciones

- **Google Calendar**: OAuth; al importar un resumen se puede crear un evento de **día completo** en la fecha de vencimiento estimada (según la tarjeta).

### UI móvil

- En la **barra superior** (junto al logo) hay un botón **Actualizar** (icono circular) para **recargar la página** sin depender del menú del navegador (útil en el celular).

### Datos y scripts

- **Seed** (`npm run db:seed`): solo **categorías** base; sin datos de demostración.
- **Limpieza** (`npm run db:wipe` o `db:wipe:production` con `vercel env pull`): borra datos de usuario y deja categorías; para empezar de cero antes de volver a `/setup`.
- **Git** (`npm run sync:github`): si hay cambios, commit `chore: sync` y push a `main` (útil para disparar deploy en Vercel).

---

## Stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS**
- **Prisma 5** + **PostgreSQL** (Neon u otro; recomendado para local y producción)
- **shadcn/ui** (Radix) · **React Hook Form** · **Zod** · **Recharts** · **date-fns**
- **tesseract.js** (OCR de comprobantes en el cliente al importar imagen en gastos)
- **googleapis** (Calendar API, opcional)

---

## Requisitos e instalación

- **Node.js** 18+ (recomendado 20+)
- **npm**

```bash
git clone <url-del-repo>
cd antinosis
npm install
cp .env.example .env
# Completá DATABASE_URL y el resto según necesites (ver tabla abajo)
npx prisma db push
npm run db:seed
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) → redirige a `/setup` si no hay usuario, o al panel.

### Acceso desde el celular (misma red WiFi)

```bash
npm run dev:lan
```

En el celular: `http://IP_DE_TU_PC:3000`. Permití Node o el puerto 3000 en el firewall de Windows si hace falta. Para OAuth Google, `NEXT_PUBLIC_APP_URL` debe coincidir con esa URL y el redirect debe estar en Google Cloud Console.

---

## Variables de entorno

Copiá `.env.example` a `.env`. **No subas `.env`** al repositorio.

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | Sí | PostgreSQL, ej. Neon: `postgresql://...?sslmode=require` |
| `NEXT_PUBLIC_APP_URL` | Recomendado | URL pública: `http://localhost:3000` o `https://tu-app.vercel.app` (OAuth y enlaces). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google Calendar OAuth. Redirect: `{NEXT_PUBLIC_APP_URL}/api/google-calendar/callback` |
| `TELEGRAM_BOT_TOKEN` | No | Bot creado con @BotFather; para alertas por Telegram. |
| `RESEND_API_KEY` / `RESEND_FROM` | No | Envío de emails (dominio verificado en Resend). |

---

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo en `localhost` |
| `npm run dev:lan` | Desarrollo en `0.0.0.0:3000` (red local) |
| `npm run build` | `prisma generate` + `next build` (**sin** `db push`; Vercel no modifica el esquema en el build) |
| `npm run start` | Producción (tras `build`) |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplicar `schema.prisma` a la base (desarrollo o contra Neon cuando cambie el modelo) |
| `npm run db:seed` | Categorías base |
| `npm run db:seed:production` | Carga `.env.production.local` (p. ej. tras `vercel env pull`) y ejecuta seed |
| `npm run db:wipe` | Borra datos de usuario; deja categorías |
| `npm run db:wipe:production` | Igual contra URL de producción |
| `npm run db:studio` | Prisma Studio |
| `npm run sync:github` | `git add`, commit y push a `main` si hay cambios |

Tras `npm install` corre `postinstall` → `prisma generate`.

---

## Deploy (Vercel)

1. Repo en **GitHub** conectado a Vercel.
2. **Build**: por defecto `npm run build` (ya incluye `prisma generate`).
3. **Variables** en el proyecto Vercel: como mínimo `DATABASE_URL` y `NEXT_PUBLIC_APP_URL` (URL real del deploy). Opcional: Google, Telegram, Resend.
4. **Esquema de base**: tras cambiar `schema.prisma`, ejecutá **`npx prisma db push`** localmente apuntando a la misma base que usa producción (no en el build de Vercel).
5. **Seed / primer usuario**: categorías con `db:seed` si hace falta; usuario inicial desde **`/setup`** en el navegador. Para poblar producción sin abrir la app en local: `db:seed:production` con env descargado.

Cada **push a `main`** suele disparar un deploy automático (`npm run sync:github` o push manual).

---

## Integraciones opcionales

### Google Calendar

1. Google Cloud Console → habilitar **Calendar API** → credenciales **OAuth cliente Web**.  
2. Redirect URI: `{NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`.  
3. En **Resúmenes**, conectar cuenta; al importar CSV se intenta crear un evento el día del vencimiento.

### Telegram (alertas)

1. @BotFather → `/newbot` → token en `TELEGRAM_BOT_TOKEN`.  
2. Configuración → canal **Telegram** + **chat id** (obtenible vía `getUpdates` o bot de info).  
3. Las alertas de umbral y vencimiento se replican al chat cuando el canal no es “solo app”.

### Email (Resend)

1. Cuenta Resend, dominio verificado.  
2. `RESEND_API_KEY`, `RESEND_FROM`.  
3. Configuración → canal **Email** + dirección.

---

## Flujo de uso

1. **`/setup`**: nombre del perfil.  
2. **`/settings`**: cargá sueldo neto, Soledad, % ahorro y umbrales para el mes.  
3. **`/cards`**: tarjetas con cierre y vencimiento.  
4. **`/expenses`**: gastos manuales del mes.  
5. **`/dashboard`**: visión general y KPIs.  
6. **`/imports`**: CSV de movimientos; opcional Calendar conectado.  
7. **`/reports`**: histórico y comparativas.

### CSV (cabeceras reconocidas)

- Fecha: `date`, `fecha`, …  
- Monto: `amount`, `monto`, `importe`, …  
- Texto: `description`, `merchant`, `comercio`, …  

Separador: coma o punto y coma.

---

## Reglas de negocio

- **Base para el % de ahorro y el límite en curso** = máx. 0, **sueldo neto − Soledad − total a pagar por resúmenes con vencimiento en ese mes calendario** (totales por resumen importado según `StatementImport.paymentDueDate`). Sobre esa base se aplica el **% de ahorro**; el **límite** es el resto salvo **tope manual** (ver `lib/calculations.ts` y `services/statementPaymentService.ts`).
- Solo gastos **manuales** cuentan para el límite y umbrales (`lib/expense-scope.ts`).
- Movimientos **importados desde CSV** no restan del tope mensual (sirven para registro, informes, cálculo de “qué pagar este mes” y calendario).

---

## Estructura del repo

```
app/                 # Rutas Next (dashboard, settings, setup, imports, API OAuth…)
components/          # UI, formularios, gráficos, layout
db/prisma/           # schema.prisma, seed, wipe-all-data.ts
lib/                 # Prisma client, cálculos, parsers CSV, OCR de comprobantes (`parse-receipt-ocr-text`), Google Calendar, notificaciones
services/            # Presupuesto, gastos, alertas, importación, pagos por vencimiento (`statementPaymentService`)
BACKLOG.md           # Backlog detallado MVP (pendientes y deuda)
```

---

## Backlog y pendientes

El detalle vivo está en **[BACKLOG.md](./BACKLOG.md)**. Resumen:

| Prioridad | Temas principales |
|-----------|-------------------|
| **P0** | Proteger acceso (auth o contraseña en env), variables bien configuradas en Vercel, onboarding guiado tras setup, idioma/moneda unificados (ej. ARS). |
| **P1** | Mejoras CSV (plantilla, validación, bancos), categorías editables en UI, PWA, pull-to-refresh opcional, migraciones Prisma formales. |
| **QA** | Validar import + evento en Google Calendar en tu entorno. |
| **P2** | Tests (incl. parsers), observabilidad, multi-usuario real, export CSV/Excel, mejoras OCR/plantillas. |

**Deuda conocida:** sin login multi-usuario, i18n mixta, moneda fija en UI, sin import PDF de resumen, WhatsApp no integrado.

---

## Licencia

Privado / según definas en el repositorio.
