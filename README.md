# Antinosis — CardSpend

Aplicación web para **controlar el gasto con tarjeta de crédito**: presupuesto mensual, seguimiento **en curso** (cargas manuales), importación de **resúmenes en CSV**, alertas por umbrales, informes históricos e integración opcional con **Google Calendar** (evento de vencimiento de pago al importar un resumen).

> **Nota:** El nombre del paquete npm es `antinosis`; en la UI la app se presenta como **CardSpend**.

---

## Qué hace el proyecto

| Área | Descripción |
|------|-------------|
| **Presupuesto** | Ingreso × % permitido, o **límite manual** (el manual gana). |
| **Gasto en curso** | Solo las cargas **manuales** cuentan para el límite y los umbrales (60 %, 70 %, …). |
| **Resúmenes importados** | CSV del banco: registra movimientos y categorías para análisis, **no resta del tope** (el cierre suele superar el límite que uno se impone). |
| **Alertas** | Por presupuesto (umbrales) y por **vencimiento de pago** al importar un resumen. |
| **Calendario** | Opcional: OAuth con Google para crear un evento el día del vencimiento estimado. |

---

## Stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS**
- **Prisma** + **PostgreSQL** (Neon / Supabase / Vercel Postgres; gratis en tier hobby)
- **shadcn/ui** (Radix) · **React Hook Form** · **Zod** · **Recharts** · **date-fns**
- **googleapis** (Calendar API, opcional)

---

## Requisitos

- **Node.js** 18+ (recomendado 20+)
- **npm**

---

## Instalación rápida

1. **Base de datos PostgreSQL gratis:** creá un proyecto en [Neon](https://neon.tech) (o Supabase), copiá el **connection string** (`DATABASE_URL`, con `?sslmode=require` si aplica).

2. En el proyecto:

```bash
git clone <url-del-repo>
cd antinosis
npm install
cp .env.example .env
# Editá .env y pegá DATABASE_URL de Neon
npx prisma db push
npm run db:seed
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) (redirige al panel).

> Antes usábamos SQLite solo en local; **Vercel y otros hostings serverless no sirven para un archivo `.db`**. Por eso el repo usa PostgreSQL para desarrollo y producción.

### Acceso desde el celular (misma red WiFi)

1. En la PC, **pará** el servidor si estaba con `npm run dev` y arrancalo así:
   ```bash
   npm run dev:lan
   ```
   Eso hace que Next escuche en **todas las interfaces** (`0.0.0.0`), no solo en `localhost`.

2. Obtené la **IP local de la PC** en la misma WiFi que el celular:
   - **Windows** (PowerShell o CMD): `ipconfig` → buscá **IPv4** del adaptador Wi‑Fi o Ethernet (ej. `192.168.0.42`).
   - El celular y la PC deben estar en la **misma red** (no datos móviles del celular salvo que uses hotspot de la PC).

3. En el navegador del celular abrí: **`http://TU_IP:3000`** (ej. `http://192.168.0.42:3000`).

4. Si no carga, revisá el **firewall de Windows**: permití conexiones entrantes para **Node.js** o el puerto **3000** (TCP) en redes privadas.

5. **Google Calendar desde el celular:** si usás OAuth, en `.env` poné `NEXT_PUBLIC_APP_URL=http://TU_IP:3000` y agregá esa misma URL + `/api/google-calendar/callback` en la consola de Google como redirect autorizado.

---

## Variables de entorno

Copiá `.env.example` a `.env` y completá:

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | **PostgreSQL** (ej. Neon). Formato: `postgresql://user:pass@host/db?sslmode=require` |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app: local `http://localhost:3000` o en Vercel `https://tu-proyecto.vercel.app` (necesaria para OAuth de Google). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Opcional: integración con Google Calendar. |

No commitees `.env` (está en `.gitignore`).

---

## Deploy en Vercel (gratis, plan Hobby)

1. Subí el código a **GitHub** (ya lo tenés).
2. En [vercel.com](https://vercel.com) → **Add New** → **Project** → importá el repo.
3. Dejá **Framework Preset: Next.js**; **Build Command** y **Output** por defecto suelen estar bien (`npm run build` ya ejecuta `prisma generate`, `db push` y `next build`).
4. En **Environment Variables** agregá al menos:
   - `DATABASE_URL` = connection string de **Neon** (misma base que uses para desarrollo o una branch “production”).
   - `NEXT_PUBLIC_APP_URL` = la URL que te asigne Vercel al terminar el primer deploy (ej. `https://antinosis.vercel.app`), o tu dominio custom.
   - Opcional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` si usás Calendar; en Google Cloud agregá como redirect autorizado:  
     `https://TU-DOMINIO.vercel.app/api/google-calendar/callback`
5. **Deploy.** El primer build aplica el schema (`prisma db push`) a la base.
6. **Datos iniciales:** desde tu PC (con el mismo `DATABASE_URL` en `.env`):

   ```bash
   npx prisma db seed
   ```

   O usá la app vacía y cargá presupuesto / tarjetas a mano.

Si el build falla, revisá en los logs que `DATABASE_URL` esté bien y que la base acepte conexiones SSL.

---

## Google Calendar (opcional)

1. [Google Cloud Console](https://console.cloud.google.com/) → habilitar **Google Calendar API**.
2. Crear credenciales **OAuth cliente Web**.
3. URI de redirección autorizada:  
   `{NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`  
   Ejemplo local: `http://localhost:3000/api/google-calendar/callback`
4. En **Resúmenes** (`/imports`), **Conectar con Google** y luego importar un CSV.

---

## Cómo se usa (flujo típico)

1. **Presupuesto** (`/budget`): definí ingreso, % o límite manual y umbrales de alerta.
2. **Tarjetas** (`/cards`): alta de tarjetas (cierre / vencimiento / últimos 4 dígitos).
3. **Gastos** (`/expenses`): cargá gastos **manuales** del mes; eso es lo que **descuenta del límite**.
4. **Panel** (`/dashboard`): KPIs, gauge, categorías, comparativas y alertas.
5. **Resúmenes** (`/imports`): subí un **CSV** con columnas tipo `fecha` / `monto` / `descripción`; se categoriza automáticamente, genera alerta de vencimiento y, si está conectado Google, un evento en el calendario. **No afecta el límite mensual.**
6. **Informes** (`/reports`): histórico con columnas **en curso** vs **importado**.

### Formato CSV de ejemplo (cabeceras reconocidas)

- Fecha: `date`, `fecha`, …
- Monto: `amount`, `monto`, `importe`, …
- Texto: `description`, `descripcion`, `merchant`, `comercio`, …

Separador: **coma** o **punto y coma**.

---

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (solo esta PC) |
| `npm run dev:lan` | Desarrollo escuchando en la red local (celular vía WiFi) |
| `npm run build` | `prisma generate` + `db push` + `next build` (necesita `DATABASE_URL` válido) |
| `npm run start` | Servidor producción (tras `build`) |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplicar schema Prisma a la base |
| `npm run db:seed` | Datos de demostración |
| `npm run db:studio` | Prisma Studio |

Tras `npm install` se ejecuta `prisma generate` (postinstall).

---

## Estructura del repo

```
app/           # Rutas, layouts, API (Google OAuth), server actions
components/    # UI, formularios, gráficos, layout
db/prisma/     # schema.prisma, seed, SQLite local
lib/           # Prisma client, cálculos, parsers CSV, Google Calendar, alcance de gastos
services/      # Lógica: presupuesto, gastos, alertas, importación
types/         # Tipos TypeScript compartidos
```

---

## Usuario y datos de prueba

El MVP usa **un usuario demo** (el primero en la tabla `User`). El seed crea tarjetas, categorías, meses de ejemplo y gastos.

---

## Reglas de negocio importantes

- **Límite mensual** = solo gastos con origen **manual** (“en curso”).
- **Importados desde resumen** = registro + informes + calendario; **no** suman al % del presupuesto ni disparan alertas por umbral de monto.
- Tipos de origen definidos en código (`lib/expense-scope.ts`); en el futuro se puede incluir p. ej. comprobantes reenviados.

---

## Despliegue (otros proveedores)

- Misma idea: `DATABASE_URL` apuntando a PostgreSQL, `NEXT_PUBLIC_APP_URL` público, variables de Google si aplica.

---

## Mantener el README al día

Cada vez que se agregue una funcionalidad relevante (nueva pantalla, variable de entorno, comando, integración), conviene **actualizar este README** en el mismo cambio y **commitear** junto con el código para que el repositorio siga siendo la fuente de verdad.

---

## Licencia

Privado / según definas en el repositorio.
