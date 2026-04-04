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
- **Prisma** + **SQLite** (MVP)
- **shadcn/ui** (Radix) · **React Hook Form** · **Zod** · **Recharts** · **date-fns**
- **googleapis** (Calendar API, opcional)

---

## Requisitos

- **Node.js** 18+ (recomendado 20+)
- **npm**

---

## Instalación rápida

```bash
git clone <url-del-repo>
cd antinosis
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) (redirige al panel).

---

## Variables de entorno

Copiá `.env.example` a `.env` y completá:

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | SQLite: por defecto `file:./dev.db` (ruta relativa al schema en `db/prisma/`). |
| `NEXT_PUBLIC_APP_URL` | URL base de la app (ej. `http://localhost:3000`). Necesaria para OAuth de Google. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Opcional: integración con Google Calendar. |

No commitees `.env` (está en `.gitignore`).

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
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
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

## Despliegue

- Ajustá `DATABASE_URL` (p. ej. PostgreSQL en producción).
- Definí `NEXT_PUBLIC_APP_URL` con la URL pública.
- Revisá límites de OAuth de Google (origen autorizado de JavaScript + redirect URI).

---

## Mantener el README al día

Cada vez que se agregue una funcionalidad relevante (nueva pantalla, variable de entorno, comando, integración), conviene **actualizar este README** en el mismo cambio y **commitear** junto con el código para que el repositorio siga siendo la fuente de verdad.

---

## Licencia

Privado / según definas en el repositorio.
