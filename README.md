# CardSpend

Aplicación web para **controlar gasto con tarjeta de crédito**. El núcleo es **CuantoQueda**: sobre el **sueldo neto** del mes (cargado a mano y editable cuando quieras) se resta **Soledad** y un **% de ahorro**; ese es el **tope para gastos manuales** del mes. Los **resúmenes importados** muestran cuánto pagás de tarjeta por vencimiento, pero **no restan** de ese tope (solo referencia). Incluye **importación de capturas** (OCR) al cargar un gasto, **resúmenes CSV y PDF** (varios bancos), alertas, informes e integraciones opcionales (**Google Calendar**, **Telegram**, **email**).

> El paquete npm se llama `antinosis`; en la UI la app se muestra como **CardSpend**.

---

## Documentación

**README** y **BACKLOG.md** describen el estado del producto en el repo. Cuando agregues o cambies una feature, **actualizá ambos** en el mismo cambio (o justo después) para que sigan reflejando el código.

---

## Tabla de contenidos

1. [Documentación](#documentación)  
2. [Funcionalidades](#funcionalidades)  
3. [Stack](#stack)  
4. [Requisitos e instalación](#requisitos-e-instalación)  
5. [Variables de entorno](#variables-de-entorno)  
6. [Scripts npm](#scripts-npm)  
7. [Deploy (Vercel)](#deploy-vercel)  
8. [Integraciones opcionales](#integraciones-opcionales)  
9. [Flujo de uso](#flujo-de-uso)  
10. [Reglas de negocio](#reglas-de-negocio)  
11. [Estructura del repo](#estructura-del-repo)  
12. [Backlog y pendientes](#backlog-y-pendientes)  
13. [Licencia](#licencia)

---

## Funcionalidades

### Core

| Área | Qué incluye |
|------|-------------|
| **Primer uso** | Ruta `/setup`: creás el único perfil de la instalación (un usuario por base de datos). |
| **Acceso (opcional)** | Variable **`APP_PASSWORD`**: pantalla `/login`, cookie de sesión de acceso (30 días) y middleware; sin ella, quien tenga la URL entra como hasta ahora. En producción, definila también en Vercel. |
| **Configuración** (`/settings`) | Por mes/año (`?month=&year=`): **sueldo neto** (estimable antes de cobrarlo), **Soledad**, **% de ahorro** sobre *(neto − Soledad)*, **tope manual** opcional, umbrales (60–100 %). Vista previa del **CuantoQueda**. **Bonos de sueldo** (aguinaldo, extras): registro por mes con monto y nota; **evolución** con dos líneas (neto vs bonos del mes) y total en tooltip. Tabla histórica de presupuesto por mes. |
| **CuantoQueda** (`/dashboard`) | Mismo selector de mes. Tarjeta principal con **saldo disponible** (tope − gasto manual); números del mes: sueldo, Soledad, base, % ahorro, tope, gasto manual; bloque **solo referencia** (total a pagar por resúmenes con vencimiento en el mes, movimientos importados del mes contable). Gauge, categorías/tarjeta, alertas, insights. |
| **Tarjetas** (`/cards`) | Alta/edición/baja: banco, nombre, marca, últimos 4, días de cierre y vencimiento. |
| **Gastos** (`/expenses`) | Movimientos **manuales** que restan del **CuantoQueda** del mes (`?month=&year=`). |
| **Informes** (`/reports`) | Comparativas mensuales, torta por categoría, gasto por tarjeta. |
| **Resúmenes** (`/imports`) | Importación **CSV** o **PDF**: cadena en `lib/parse-statement-import.ts` — **CSV** genérico (montos AR; columnas USD o celdas `U$S`/`USD`); **PDF/texto** según formato detectado — **Brubank**, **BBVA Argentina** (Visa), **Banco Nación / Mastercard** (p. ej. Nativa). Consumos en **USD** se convierten a ARS con **cotización oficial BCRA** (`lib/bcra-usd-ars-rate.ts`). Movimientos importados quedan ligados al resumen (`Expense.statementImportId`); las vistas del **mes calendario** filtran por **fecha de operación** (`transactionDate`), no por el mes del formulario de import. Categorización heurística (`lib/statement-categorize.ts`); alerta de vencimiento; opcional **Google Calendar**; UI de error si falla la carga (`app/imports/error.tsx`). |

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
- **Middleware** opcional: puerta de acceso con `APP_PASSWORD` (`/login`, cookie httpOnly)
- **Server Actions**: límite de cuerpo **8 MB** para subir PDFs de resumen (`next.config.mjs` → `experimental.serverActions.bodySizeLimit`)
- **Prisma 5** + **PostgreSQL** (Neon u otro; recomendado para local y producción)
- **shadcn/ui** (Radix) · **React Hook Form** · **Zod** · **Recharts** · **date-fns**
- **pdf-parse** (texto de PDFs de resumen) · **tesseract.js** (OCR de comprobantes en el cliente al cargar imagen en gastos)
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
| `APP_PASSWORD` | No | Si la definís, la app pide contraseña en `/login` (cookie segura; compatible con Google Calendar). Sin variable, el comportamiento es el de siempre (acceso abierto a quien tenga la URL). |

---

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo en `localhost` |
| `npm run dev:lan` | Desarrollo en `0.0.0.0:3000` (red local) |
| `npm run build` | En **local**: `prisma generate` + `next build`. En **Vercel** (`VERCEL=1`): antes corre **`prisma db push`** automático y luego genera + compila (ver `scripts/vercel-build.js`). |
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
2. **Build**: `npm run build` ejecuta `scripts/vercel-build.js`. En **Vercel** aplica automáticamente **`prisma db push`** contra la base configurada (necesitás **`DATABASE_URL`** en variables de entorno del proyecto). En tu PC, `npm run build` **no** hace `db push`; para alinear la base local usá `npm run db:push`.
3. **Variables** en el proyecto Vercel: como mínimo **`DATABASE_URL`** (obligatoria para que el build aplique el esquema) y `NEXT_PUBLIC_APP_URL` (URL real del deploy). Opcional: Google, Telegram, Resend. Si usás **puerta de acceso**, agregá **`APP_PASSWORD`** (misma idea que en `.env` local).
4. **Previews / ramas**: si un deploy de preview usa la **misma** `DATABASE_URL` que producción, cada build también ejecutará `db push` (el esquema queda al día; conviene que sea consciente o usar otra base para previews).
5. **Seed / primer usuario**: categorías con `db:seed` si hace falta; usuario inicial desde **`/setup`** en el navegador. Para poblar producción sin abrir la app en local: `db:seed:production` con env descargado.
6. **PDF en serverless**: la lectura de PDF (`pdf-parse`) se carga **solo al importar un archivo**, no al abrir `/imports`. Worker de pdfjs: `PDFParse.setWorker` + ruta `file://` (`lib/pdf-worker-path.ts`) y `serverComponentsExternalPackages` en `next.config.mjs` — detalle en **[BACKLOG.md — Nota: PDF en serverless](./BACKLOG.md#nota-pdf-en-serverless-vercel)**.

Cada **push a `main`** suele disparar un deploy automático (`npm run sync:github` o push manual).

---

## Integraciones opcionales

### Google Calendar

1. Google Cloud Console → habilitar **Calendar API** → credenciales **OAuth cliente Web**.  
2. Redirect URI: `{NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`.  
3. En **Resúmenes**, conectar cuenta; al importar **CSV o PDF** se intenta crear un evento el día del vencimiento (si hay token y el env está bien configurado).

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
2. **`/settings`**: para el mes que elijas, cargá **sueldo neto** (podés estimarlo y editarlo después), Soledad, % ahorro y umbrales.  
3. **`/cards`**: tarjetas con cierre y vencimiento.  
4. **`/expenses`**: gastos manuales del mes (mismo mes que en el panel).  
5. **`/dashboard`**: **CuantoQueda** — cuánto te queda bajo el tope de gasto manual.  
6. **`/imports`**: CSV o PDF (Brubank, BBVA, Banco Nación MC, u otro banco vía CSV); opcional Calendar conectado.  
7. **`/reports`**: histórico y comparativas.

### CSV (cabeceras reconocidas)

- Fecha: `date`, `fecha`, …  
- Monto en pesos: `amount`, `monto`, `importe`, `pesos`, `ars`, … (formato argentino: `$ 1.234,56`)  
- Monto en USD (opcional): columnas tipo `usd`, `monto_usd`, `importe_usd`, `dolares`, … o celdas con texto `U$S` / `USD`  
- Texto: `description`, `merchant`, `comercio`, …  

Separador: coma o punto y coma.

### PDF / texto de resumen (varios bancos)

Se extrae texto con **pdf-parse** y se elige el parser según el contenido (`lib/parse-statement-import.ts`):

| Formato | Detección / módulo |
|--------|---------------------|
| **Brubank** | Tabla tipo `Fecha` / `#Ref` / descripción / montos en pesos o `U$S` · `lib/parse-brubank-statement.ts` |
| **BBVA Argentina** | Cabecera `FECHA DESCRIPCIÓN NRO. CUPÓN PESOS DÓLARES` · `lib/parse-bbva-statement.ts` |
| **Banco Nación (Mastercard / Nativa, etc.)** | `DETALLE DEL MES` + cupón; líneas con o sin cuota `NN/NN` · `lib/parse-banco-nacion-mc-statement.ts` |

Los consumos en **dólares** se pasan a pesos con la **cotización oficial del USD publicada por el BCRA** para esa fecha (`lib/bcra-usd-ars-rate.ts`; API `Cotizaciones?fecha=`; si el día no tiene dato, último día hábil anterior con cotización). No hace falta convertir a CSV si el PDF está soportado.

---

## Reglas de negocio

- **CuantoQueda / tope de gasto manual** = máx. 0, **(sueldo neto − Soledad) × (1 − % ahorro/100)** salvo **tope manual** que lo reemplace (`lib/calculations.ts`). El **sueldo neto** es el valor guardado en configuración para ese mes/año (editable en cualquier momento); la evolución histórica usa ese mismo valor por mes.
- **Los resúmenes importados no entran** en el cálculo del tope: el total a pagar por vencimiento en el mes (`services/statementPaymentService.ts`, `StatementImport.paymentDueDate`) se muestra como **referencia** en el panel, no resta del disponible para gasto manual.
- Solo gastos **manuales** cuentan para el tope y umbrales (`lib/expense-scope.ts`).
- Movimientos **importados** (CSV/PDF) no restan del tope (registro, informes, referencia de pagos y calendario).
- **Mes del panel / gastos / presupuesto**: selector **`?month=&year=`** alineado con Configuración. Los gastos manuales se filtran por **fecha de operación** en ese mes calendario (`lib/month-transaction-filter.ts`).

---

## Estructura del repo

```
app/                 # Rutas Next (dashboard, settings, setup, imports, API OAuth…)
actions/             # Server Actions (p. ej. bonos de sueldo)
components/          # UI, formularios, gráficos, layout
db/prisma/           # schema.prisma, seed, wipe-all-data.ts
lib/                 # Prisma client, cálculos, parsers (CSV, import unificado, Brubank/BBVA/Banco Nación), fechas DD-Mmm-YY, BCRA USD, OCR comprobantes, Calendar, notificaciones
services/            # Presupuesto, gastos, alertas, bonos de sueldo, importación de resúmenes, pagos por vencimiento
BACKLOG.md           # Backlog detallado MVP (pendientes y deuda)
```

---

## Backlog y pendientes

El detalle vivo está en **[BACKLOG.md](./BACKLOG.md)**. Resumen:

| Prioridad | Temas principales |
|-----------|-------------------|
| **P0** | Auth por **usuario** / **admin** y **dashboard de operaciones** al salir al público; variables en Vercel (incl. `APP_PASSWORD` si aplica); onboarding guiado; idioma/moneda (ej. ARS). |
| **P1** | Cuotas y seguimiento mensual; bonificaciones/reintegros + KPI; millas/puntos + KPI; **adicionales de tarjeta** (alta/edición, detección en consumos importados, KPI en dashboard); **Google Calendar al importar** (cerrar flujo: duplicados, errores visibles); plantilla/validación CSV; categorías editables en UI; PWA; pull-to-refresh; migraciones Prisma formales. |
| **QA** | Validar import CSV/PDF + evento en Google Calendar en tu entorno. |
| **P2** | Tests (incl. parsers), observabilidad, multi-usuario real, export CSV/Excel, mejoras OCR/plantillas. |

**Deuda conocida:** la **puerta global** `APP_PASSWORD` ya está en el código; falta **login por cuenta**, roles **admin** y dashboard de métricas (ver BACKLOG). Sin multi-usuario real todavía; i18n mixta; moneda fija en UI (`formatCurrency`); WhatsApp no integrado; parsers PDF para **más** bancos = ampliar según necesidad. Los **bonos de sueldo** figuran en Configuración y en la evolución; no entran aún en el tope del dashboard (ver BACKLOG).

---

## Licencia

Privado / según definas en el repositorio.
