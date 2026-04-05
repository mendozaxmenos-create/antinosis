# CardSpend — Backlog MVP

Documento vivo: **qué hay hoy** en el repo y **qué falta** para cerrar un MVP usable en producción.

---

## Alcance del MVP (propuesta)

- Una persona registra tarjetas, define tope mensual de gasto en tarjeta y carga gastos manuales.
- Ve dashboard con avisos de umbral y, si configura Google, eventos de vencimiento en Calendar.
- Puede importar movimientos desde **CSV** (no PDF) para registro y conciliación visual.
- **Un solo usuario** por instalación (sin login multi-cuenta en esta fase).

---

## Estado actual — ya implementado

### Infra y datos

| Área | Qué incluye |
|------|-------------|
| **Stack** | Next.js 14 (App Router), Prisma 5, PostgreSQL (Neon), Vercel-friendly build |
| **Esquema** | Usuario, tarjetas, categorías, gastos, presupuesto mensual, umbrales de alerta, importaciones de resumen, resultados de conciliación, eventos de alerta |
| **Seed** | Solo categorías base (`npm run db:seed`); sin datos de prueba |
| **Setup** | `/setup` crea el primer usuario; `npm run db:wipe` / `db:wipe:production` limpia datos de usuario |
| **Scripts** | `db:seed:production`, `db:wipe:production` con `dotenv-cli` para no depender de PowerShell |

### Funcionalidad de producto

| Módulo | Implementado |
|--------|----------------|
| **Dashboard** | Gauge de presupuesto, gasto por categoría/tarjeta, alertas (umbral + vencimientos), gastos recientes, insights texto |
| **Budget** | Ingreso, % permitido sobre ingreso, tope manual opcional, umbrales 60–100%, `getOrCreateBudgetConfig` con defaults |
| **Cards** | CRUD tarjetas (banco, nombre, marca, últimos 4, cierre/vencimiento) |
| **Expenses** | Alta/baja/edición gastos manuales, categoría, tarjeta, mes contable |
| **Reports** | Resúmenes mensuales, torta por categoría, barras comparativas, gasto por tarjeta |
| **Imports / Resúmenes** | Importación **CSV** con parser flexible; categorización heurística; registro de importación; opcional Google Calendar para evento de vencimiento |
| **Google Calendar** | OAuth (auth + callback), guardado de refresh token en usuario, conexión/desconexión en UI |
| **Alertas** | Umbrales al superar % del tope (solo gastos `manual`); alertas de pago por import |

### Reglas de negocio explícitas

- Límite mensual aplica solo a gastos **manuales**; importados no consumen el tope (`lib/expense-scope.ts`).
- Primer usuario por `createdAt` = “cuenta activa” (`getDefaultUserId`).

### UI

- Layout con navegación principal; `/setup` sin menú lateral de secciones.
- Componentes tipo shadcn (cards, tablas, formularios, alertas).
- Gráficos con Recharts.

---

## Brechas conocidas (deuda / riesgo)

- **Sin autenticación**: cualquiera con la URL puede usar la app si conoce el deployment (no hay sesión ni contraseña).
- **Single-tenant frágil**: `createFirstUserAction` solo bloquea si ya hay filas en `User`; no hay cuentas ni invitaciones.
- **i18n mezclada**: UI en inglés y español según pantalla.
- **Moneda**: `formatCurrency` fija USD; Argentina u otra moneda no parametrizada en UI.
- **Build en Vercel**: `prisma db push` en cada build muta el esquema; en equipos grandes conviene migraciones (`prisma migrate`) y pipeline aparte.
- **Tests**: no hay suite automatizada (e2e/unit).
- **PDF de resumen**: el modelo permite “imported_pdf” como concepto; el flujo actual es CSV, no extracción PDF.
- **Conciliación**: campos y `reconciliationResult` existen; flujo “matched/unmatched” puede estar incompleto respecto al modelo mental del producto (revisar `statementImportService` y UI).

---

## Backlog sugerido — por prioridad

### P0 — MVP “cerrable” para uso personal serio

1. **Proteger el acceso (mínimo)**  
   - Opción A: **middleware** + contraseña compartida vía env (`APP_PASSWORD` + cookie firmada).  
   - Opción B: **NextAuth / Auth.js** con un solo proveedor (Google) o credenciales.  
   - Criterio: no exponer datos financieros sin ningún control en URL pública.

2. **Variables de entorno documentadas para producción**  
   - Lista canónica: `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, Google OAuth si aplica, y las nuevas claves de auth.  
   - Comprobar redirect OAuth en dominio Vercel definitivo.

3. **Flujo post-setup**  
   - Tras crear usuario, redirigir o sugerir: “Agregá tu primera tarjeta” / “Configurá el presupuesto del mes” (empty states guiados en dashboard y cards).

4. **Revisión de copy y un solo idioma**  
   - Elegir ES o EN para MVP y alinear strings (alertas aún en inglés: “% of monthly budget reached”).

5. **Moneda y locale**  
   - `NEXT_PUBLIC_CURRENCY` o perfil de usuario + `Intl` para símbolo y separadores.

### P1 — Mejora de producto pre-usuarios externos

6. **Importación de resumen**  
   - Plantilla CSV descargable + ayuda en pantalla; validación de columnas más explícita.  
   - Evaluar parser por banco (priorizar 1–2 bancos del mercado objetivo).

7. **Edición de categorías**  
   - Hoy son seed fijas; permitir renombrar/alta/baja sin tocar DB a mano.

8. **Notificaciones**  
   - Email o push fuera de alcance; al menos **recordatorio en UI** de vencimientos próximos (lista ya parcial en dashboard).

9. **PWA o “Añadir a inicio”**  
   - `manifest.json`, iconos, meta theme-color para uso móvil (ya usable en navegador; esto mejora UX).

10. **Migraciones Prisma**  
    - Sustituir o complementar `db push` en CI/prod con `migrate deploy`.

### P2 — Escalabilidad y calidad

11. **Tests**  
    - Unit: `lib/calculations`, `parse-statement-csv`.  
    - Integración: server actions críticas con DB de test.

12. **Observabilidad**  
    - Logging estructurado en imports y OAuth; página de error amigable.

13. **Multi-usuario real**  
    - Modelo de cuenta, login, aislamiento de datos por `userId` en todas las queries (ya está por usuario; falta auth).

14. **Exportación**  
    - CSV/Excel de gastos por rango de fechas.

---

## Resumen ejecutivo

| | |
|--|--|
| **Sólido para MVP interno** | Presupuesto, tarjetas, gastos manuales, dashboard, alertas de umbral, import CSV, Google Calendar opcional, deploy Vercel + Neon. |
| **Antes de compartir la URL** | Alguna forma de **control de acceso** + OAuth/callback alineados al dominio + moneda/locale coherentes. |
| **Siguiente iteración de producto** | Categorías editables, mejor onboarding vacío, import por banco, PWA. |

---

*Última revisión según código en repo (App Router, servicios y Prisma). Actualizar este archivo cuando cierren ítems o cambien el alcance del MVP.*
