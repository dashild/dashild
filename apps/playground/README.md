# playground

App Next.js 16 que **simula una aplicación que ya existía**. Es la demo y el entorno de desarrollo del panel; no se publica en npm.

La regla es simple: todo lo que ves aquí lo tenía la app antes de Dashild. Si una pieza existe solo para que Dashild funcione, está en el sitio equivocado.

## Stack de UI

- **Tailwind CSS v4 + shadcn/ui** (preset `radix-nova`, base Radix, iconos `lucide`).
- Las primitivas shadcn viven en `@dashild/admin/ui/*`; la app las importa desde ahí. El shell también está en `@dashild/admin`.
- `components/dashild/` solo conserva lo propio de esta app: login, signup, el layout de autenticación y el `IconProvider`.
- Tailwind escanea el build del paquete con `@source` en `app/globals.css`; no hay CSS propio.
- No hay `space-y-*`, colores crudos ni iconos con `size-4` dentro de un componente que ya los dimensiona.

## Autenticación: Better Auth

Better Auth 1.7 con el adapter de Prisma, email y contraseña.

```text
lib/auth.ts                       configuración del servidor
lib/auth-client.ts                cliente para login/signup
lib/auth-actions.ts               signOut, tema y cambio de organización
app/api/auth/[...all]/route.ts    handler de Better Auth
lib/session.ts                    getCurrentUser (sesión + campos de dominio)
```

- Los ids de usuario se generan como UUID (`advanced.database.generateId`) porque `User.id` es `@db.Uuid`.
- El proxy solo comprueba la presencia de `better-auth.session_token`; la comprobación real la hace cada página con `auth.api.getSession`.
- Un usuario recién registrado no tiene organización: el panel le muestra el dashboard, pero no verá datos cuando exista el aislamiento.
- Credenciales de demo (tras `db:seed`): `ana@acme.test` / `dashild123`. También `bruno@beta.test` y `carla@acme.test`.

## Panel

- `/admin` — shell con `sidebar-07`: selector de organización, grupos y recursos colapsables; header, tema y dashboard vacío si no hay recursos.
- `/admin/users` — el recurso User.
- `/login` y `/signup` — blocks `login-02` y `signup-02` adaptados a Better Auth.
- `src/dashild/panel.ts` — ruta, marca, tema (`defaultMode`, `toggle`, `primary`), sidebar, ancho de contenido, recursos, `locale` y auth.
- `locale: "es"` activa el catálogo español de core; el framework usa inglés por defecto. Los labels de recursos siguen siendo datos de la app.
- El tema se guarda en la cookie `dashild_theme` y se aplica como `.dark` en el contenedor del panel, no en el `<html>`: Dashild no toca el layout raíz.

### Estructura de `src/dashild`

```text
panel.ts        configuración del panel (editar)
policies.ts     seguridad: scopes y permisos (editar)
icons.ts        overrides de iconos (opcional)
resources/      un archivo por recurso (editar)
actions/        handlers propios: index.ts + <modelo>.ts (editar si hay acciones)
runtime.ts      Prisma + metadata + panel + policies
server/         metadata.ts, read.ts, write.ts (runtime de servidor, no editar)
```

La regla: **arriba, lo que se edita; en `server/`, el pegamento que no deberías tocar**. El shell, la tabla, el formulario y el Zod de cliente viven en `@dashild/admin`; `lib/auth-actions.ts` es autenticación de la app, no handlers de recursos.

### Iconos y grupos

`navigation.group` coloca el recurso en un grupo del sidebar. `navigation.icon` acepta un nombre del mapa base de `packages/admin/src/components/nav-main.tsx` (`users`, `building`, `file-text`, `settings`, `database`, `folder`, `chart`, `package`, `shopping-cart`, `tag`, `calendar`, `mail`, `briefcase`, `credit-card`, `truck`, `layers`) **o uno propio declarado en `src/dashild/icons.ts`**:

```ts
import { Rocket } from "lucide-react";

export const icons = { rocket: Rocket };
```

No hay comando para esto: es un archivo de la app, como `panel.ts`. Un nombre desconocido no rompe el panel: usa `Table2` y avisa por consola en desarrollo.

### CRUD

- `/admin/<slug>/create` — formulario de creación.
- `/admin/<slug>/<id>` — detalle del registro.
- `/admin/<slug>/<id>/edit` — formulario de edición.
- Menú `...` por fila con Ver, Editar y Eliminar; el borrado pide confirmación.
- Validación de cliente con React Hook Form + Zod y validación autoritativa en el servidor.
- Errores de Prisma traducidos: P2002 a campo único, P2003 a relación, P2025/P2007 a “no existe”.

`pnpm --filter playground db:write-smoke` crea, actualiza y borra un usuario con el mismo camino que la acción de servidor.

### Celdas y campos propios

`src/dashild/registry.tsx` registra `avatar` como celda y `email` como campo. El recurso los usa con `cell: "avatar"` y `component: "email"`. `AppRegistryProvider` envuelve `AdminPage` en la ruta.

### Acciones

Por defecto: `create`, `view`, `edit`, `delete` en tabla y `save`, `cancel` en formulario. Declarar `table.actions` o `form.actions` **reemplaza** la lista: si omites `delete`, desaparece.

Los handlers propios viven en `src/dashild/actions/<modelo>.ts` y se registran en `actions/index.ts`:

```ts
// src/dashild/actions/user.ts
import type { ActionHandler } from "@dashild/core";

export const actions = {
  export: async ({ id }) => ({ ok: true, message: "Exportado." }),
} satisfies Record<string, ActionHandler>;
```

```ts
// src/dashild/resources/user.ts
table: {
  actions: [
    { name: "create", placement: "header" },
    { name: "export", placement: "header", label: "Exportar Excel" },
    { name: "view" },
    { name: "edit" },
  ],
},
```

`runResourceAction` resuelve el recurso desde el panel, comprueba la sesión, valida que la acción esté declarada y busca el handler. La lógica nunca cruza al cliente; el recurso solo lleva datos.

### Aislamiento

- `src/dashild/policies.ts` define `organizationOf`/`rolesOf` y, por recurso, un `scope` (fragmento `where`) y `can` (permisos).
- Un recurso sin `policy` o sin entrada en `policies.resources` **falla cerrado**: el listado, el detalle y las escrituras devuelven denegado/404.
- El ámbito se aplica a listado, `count`, detalle, actualización y borrado; las opciones de relación se filtran por la organización activa.
- `can.create`/`can.update` impiden mover registros a otra organización; `can.delete` restringe el borrado y la UI oculta el botón cuando es falso.
- La organización activa sale de la cookie del switcher, validada en servidor.

`pnpm --filter playground db:security-smoke` verifica A/B con Ana (org-1 admin), Bruno (org-2) y Carla (org-1): listados, detalle, organizaciones, opciones del formulario, permisos y fallo cerrado.

`pnpm --filter playground db:scope-smoke` prueba la extensión `withDashildScope` con consultas directas de Prisma: Ana no ve ni modifica filas de Bruno. Es la segunda barrera para código que no pasa por el runtime.

### Selector de organización

El team switcher de `sidebar-07` es el selector de organización. La cookie `dashild_organization` se valida en servidor en cada petición:

- `ADMIN`: puede cambiar a cualquier organización.
- `USER`: solo a la suya; una cookie manipulada se ignora.

Hoy el selector cambia la organización activa que devuelve `getCurrentUser`, pero el listado todavía no filtra por ella: el aislamiento de datos es el Bloque 4.

## Base de datos

Postgres de lerd, base `playground`, en `127.0.0.1:5432`.

```bash
pnpm --filter playground prisma:generate
pnpm --filter playground db:push     # sincroniza el schema
pnpm --filter playground db:seed     # RESETEA usuarios y posts, y crea cuentas Better Auth
pnpm --filter playground db:smoke    # lee tipos crudos de Prisma
```

`prisma.config.ts` es la única fuente de la URL para el CLI. Prisma 7 no acepta `url` en el schema ni carga `.env` solo, por eso el config importa `dotenv/config`.

Si el panel devuelve `P1001`, el servicio de Postgres está parado: `lerd service start postgres`.

## Comandos

```bash
pnpm --filter playground dev       # http://localhost:3100
pnpm --filter playground build
pnpm --filter playground typecheck # requiere prisma:generate antes
```

## Requisitos

Node.js >= 22.
