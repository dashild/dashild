# Instalación de Dashild (alpha)

Versión de esta guía: `0.1.0-alpha.6`.

Dashild es un panel administrativo para Next.js + Prisma. Un recurso es un
archivo de datos; no hay páginas que generar ni archivos que sincronizar.

## 1. App nueva

```bash
pnpm create dashild@latest mi-app
```

El scaffolder reutiliza `create-next-app` y pregunta:

1. Nombre y carpeta.
2. Starter: `basic` (solo el panel) o `demo` (usuarios, posts y etiquetas).
3. Autenticación: Better Auth (email + contraseña) o ninguna.
4. Base de datos: PostgreSQL, MySQL o SQLite, y su `DATABASE_URL`.
5. Instalar, inicializar git, migrar y sembrar.

También acepta flags:

```bash
npx create-dashild@latest mi-app \
  --template demo \
  --database postgresql \
  --database-url "$DATABASE_URL" \
  --pm pnpm \
  --yes
```

| Flag | Valores |
| --- | --- |
| `--template` | `basic`, `demo`, `local:<ruta>`, `github:<owner>/<repo>#<ref>` |
| `--auth` | `better-auth`, `none` |
| `--database` | `postgresql`, `mysql`, `sqlite` |
| `--database-url` | URL de conexión |
| `--direct-url` | URL sin pooler para migraciones |
| `--pm` | `pnpm`, `npm`, `yarn`, `bun` |
| `--path` | Ruta del panel (por defecto `/admin`) |
| `--no-install` | No instala dependencias |
| `--no-git` | No inicializa git |
| `--no-migrate` | No aplica el esquema |
| `--no-seed` | No carga los datos del starter |
| `--dry-run` | Imprime el plan sin escribir |
| `--list-templates` | Lista los starters incluidos |

Si la base de datos no está disponible, el proyecto se crea igual y deja las
migraciones y el seed como pasos pendientes. El resto de esta guía es la
instalación manual sobre una app existente.

## 2. Requisitos

- Node.js 22 o superior.
- Next.js 15 o 16 con App Router.
- Prisma 7.10 o superior y un cliente Prisma generado con `prisma-client`.
- PostgreSQL, MySQL/MariaDB o SQLite. PostgreSQL y SQLite están verificados
  end-to-end en esta alpha; MySQL/MariaDB está soportado por el adapter.
- Tailwind CSS v4 y shadcn/ui para el shell.

## 3. Instalar los paquetes

```bash
pnpm add @dashild/core@alpha @dashild/admin@alpha @dashild/prisma@alpha
pnpm add -D @dashild/cli@alpha
```

Los paquetes se publican con el tag `alpha`. No uses `latest` hasta que exista
una versión estable.

## 4. Configurar Prisma

Añade los dos generadores a `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

generator dashild {
  provider = "dashild-prisma-generator"
  output   = "../src/generated/dashild"
}
```

`dashild` escribe `dashild-metadata.json`: el contrato que usan la CLI, el
runtime y el panel. No es configuración administrativa.

Prisma 7 necesita un `prisma.config.ts` y un adapter. Ejemplo mínimo:

```ts
import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

Asegúrate de que tu app exporta un cliente Prisma. Por defecto, `init` busca
`src/lib/prisma.ts` o `lib/prisma.ts` con una exportación `prisma`:

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/src/generated/prisma/client";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
```

Para SQLite usa `@prisma/adapter-better-sqlite3` y `better-sqlite3`; para
MySQL/MariaDB, `@prisma/adapter-mariadb`. El scaffolder elige el correcto.

### SQLite

`DATABASE_URL="file:./prisma/dev.db"`. El CLI de Prisma y el adapter resuelven
la ruta desde la raíz del proyecto. El scaffolder instala `better-sqlite3` con
el Node que ejecuta la app (fija `PATH` y `npm_config_target`) porque pnpm no
incluye `node-gyp`.

## 5. Montar el panel

Para una app nueva, o una que aún no tiene autenticación, usa Better Auth:

```bash
pnpm dashild init --auth better-auth
```

El comando muestra el plan y no escribe nada hasta que añadas `--yes`:

```bash
pnpm dashild init --auth better-auth --yes
```

Si la app ya tiene su propia autenticación, usa el modo por defecto y conecta el
adaptador a mano:

```bash
pnpm dashild init
```

Escribe:

```text
src/dashild/panel.ts
src/dashild/policies.ts
src/dashild/actions/index.ts
src/dashild/icons.tsx
src/dashild/runtime.ts
src/dashild/server.ts
src/dashild/registry.tsx
src/app/<ruta>/[[...dashild]]/page.tsx
```

Con `--auth better-auth` añade además:

```text
src/lib/auth.ts
src/lib/auth-client.ts
src/lib/session.ts
src/lib/auth-actions.ts
src/lib/email.ts
src/app/api/auth/[...all]/route.ts
src/app/login/page.tsx
src/app/signup/page.tsx
src/app/forgot-password/page.tsx
src/app/reset-password/page.tsx
src/components/dashild/login-form.tsx
src/components/dashild/signup-form.tsx
src/components/dashild/forgot-password-form.tsx
src/components/dashild/reset-password-form.tsx
```

y, si el schema no tiene ya modelos de autenticación, añade `User`, `Session`,
`Account` y `Verification` a `prisma/schema.prisma`. También añade
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ALLOW_SIGNUP` y
`REQUIRE_EMAIL_VERIFICATION` a `.env.example`, y `better-auth` a
`package.json`.

No toca `middleware.ts`/`proxy.ts`, el layout raíz, `next.config` ni `.env`.
Después de `--auth better-auth` ejecuta otra vez:

```bash
pnpm prisma generate
pnpm prisma db push
```

y configura `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` en tu `.env`:

```bash
openssl rand -base64 32
```

Si ya existe `app/admin/page.tsx`, `init` elige `/panel`, `/admin-panel` o
`/dashild`. Usa `--path /otra-ruta` para forzarla y `--dry-run` para revisar el
plan.

## 6. Autenticación

Con `--auth better-auth`, `src/dashild/panel.ts` ya queda conectado a la sesión
real y `/login` y `/signup` funcionan. La configuración generada incluye:

- **Rate limiting**: 100 peticiones por minuto.
- **Cierre de signup público**: `ALLOW_SIGNUP="false"` desactiva el alta y la
  página de signup muestra “Sign-up disabled”. El API también la rechaza.
- **Verificación de email**: `REQUIRE_EMAIL_VERIFICATION="true"` la exige. Antes
  de activarla, implementa un proveedor real en `src/lib/email.ts`.
- **Reset de contraseña**: `/forgot-password` envía el enlace y
  `/reset-password?token=...` fija la nueva contraseña.

`sendEmail` es un stub: en desarrollo imprime el correo en la consola; en
producción lanza un error para que no se pierdan emails en silencio. Sustitúyelo
por Resend, Postmark, SES o tu transporte.

Con `--auth none`, `init` deja un adaptador vacío:

```ts
async function getCurrentUser(): Promise<CurrentUser | null> {
  // TODO: conecta tu sesión real.
  return null;
}

export const panel = definePanel({
  title: "Admin",
  path: "/admin",
  resources: [],
  auth: { getCurrentUser },
});
```

Devuelve el usuario de **tu** autenticación. Dashild no impone Better Auth ni
toca tus cookies. `CurrentUser` necesita al menos `id`; `email`, `name`,
`organizationId` y `roles` son opcionales. Si devuelves `organizationId` y
`roles`, las políticas los reciben sin configurar nada más.

Si el schema ya tenía un modelo `User` o alguno de los modelos de sesión,
`init --auth better-auth` **no lo modifica**: avisa y deja la adaptación en tus
manos.

## 7. Tailwind

El shell vive en `@dashild/admin`. Tailwind debe escanear su build. Añade esto a
tu CSS global (ajusta la ruta según tu estructura):

```css
@source "../../node_modules/@dashild/admin/dist";
```

También necesitas las variables de tema de shadcn (`--background`,
`--foreground`, `--primary`, `--sidebar`, etc.) y las clases de tema. El
scaffolder escribe un `globals.css` completo; para una instalación manual puedes
partir de `apps/playground/src/app/globals.css`.

Define una pila de fuentes real en `--font-sans`; una variable autoreferenciada
deja la app en Times New Roman.

## 8. Crear el primer recurso

```bash
pnpm dashild make:resource Customer
pnpm dashild doctor
```

`make:resource` escribe un archivo y **no lo vuelve a tocar**. Además:

- añade el import y el recurso a `panel.resources`;
- añade una entrada en `src/dashild/policies.ts` con `scope: () => null`;
- el recurso nace con `policy: { scope: "default" }`.

La entrada de política es **fail-closed**: el recurso devuelve 404 hasta que
definas el ámbito y los permisos. Edita `policies.ts`:

```ts
import { definePolicies, hasRole, type CurrentUser } from "@dashild/core";

export const policies = definePolicies<CurrentUser>({
  Customer: {
    scope: (ctx) => ({ organizationId: ctx.organizationId }),
    can: {
      create: (ctx) => hasRole(ctx, "ADMIN", "SALES"),
      delete: (ctx) => hasRole(ctx, "ADMIN"),
    },
  },
});
```

Sin `policy` y sin entrada en `policies.ts`, el runtime **falla cerrado**. Es
intencionado. Los roles salen de `getCurrentUser().roles` o de `rolesOf`; la
organización de `getCurrentUser().organizationId` o de `organizationOf`.

Si no quieres que `make:resource` toque `panel.ts`/`policies.ts`, usa
`--no-register`.

## 9. Relaciones, archivos y componentes propios

- **o2m/m2m**: el detalle del padre monta un `RelationManager` para crear,
  editar y eliminar hijos; si la FK es opcional permite desasociar y en m2m
  attach/detach. El modelo hijo necesita un recurso en `panel.resources`.
- **Bytes**: se edita con un selector de archivo y viaja como base64.
- **Celdas y campos propios**: crea `src/dashild/registry.tsx` en el cliente:

```tsx
"use client";

import {
  registerCell,
  registerField,
  registeredCells,
  registeredFields,
} from "@dashild/core";
import { RegistryProvider } from "@dashild/admin";

registerCell("avatar", AvatarCell);
registerField("email", EmailField);

export function AppRegistryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RegistryProvider cells={registeredCells()} fields={registeredFields()}>
      {children}
    </RegistryProvider>
  );
}
```

Envuelve `AdminPage` con `AppRegistryProvider` y referencia los componentes
desde el recurso:

```ts
table: { columns: [{ field: "name", cell: "avatar" }] }
form: { fields: [{ field: "email", type: "email", component: "email" }] }
```

`dashild ui:add avatar email` copia las plantillas a
`components/dashild/` y te recuerda cómo registrarlas.

## 10. Doctor y eject

`dashild doctor` valida recursos, campos, relaciones, políticas y handlers de
acciones contra los metadatos, con archivo y línea, `--json` y exit 1.

`dashild eject` retira los archivos que escribió `init` (panel, políticas,
acciones, iconos, runtime, server, registry y la ruta de montaje) y elimina el
script `dashild`. No toca recursos, autenticación, schema ni dependencias; los
lista como “Kept” para que decidas qué borrar. Sin `--yes` solo muestra el plan;
`--dry-run` hace lo mismo de forma explícita.

## 11. Arrancar

```bash
pnpm dev
```

El panel queda en `http://localhost:3000/admin` (o la ruta que hayas elegido).
En desarrollo usa `localhost`, no `127.0.0.1`: Next 16 bloquea los assets y la
hidratación desde orígenes no permitidos. El scaffold añade
`allowedDevOrigins: ["127.0.0.1", "localhost"]`; si usas otro dominio, añádelo.

## 12. Problemas comunes

- **El panel no hidrata en `127.0.0.1`**: usa `localhost` o añade el origen a
  `allowedDevOrigins`.
- **`better-sqlite3` con ABI incorrecta**: reinstala con el Node que ejecuta la
  app y `npm_config_target` igual a `node -v`. pnpm no trae `node-gyp`, así que
  el prebuild debe coincidir.
- **Login con error de origen**: `BETTER_AUTH_URL` debe coincidir con el origen
  real (`http://localhost:3000` por defecto).
- **Prisma no conecta**: si usas lerd, comprueba que el servicio PostgreSQL está
  arrancado; el idle puede suspenderlo.

## Limitaciones conocidas de la alpha

- MySQL/MariaDB está soportado por el adapter pero no tiene E2E en CI todavía.
- `DateTime` sin `@db.Date` se trata como fecha y hora; el recurso puede forzar
  `format: "date"`.
- Las listas escalares (`String[]`) quedan fuera de tabla y formulario en v1.
- El tema `system` no está implementado; hay `light`/`dark` por cookie.
- El registro manual de handlers de acciones (`actions/index.ts`) sigue siendo
  manual.
- La documentación pública está en español; la traducción al inglés está
  pendiente.
- Las APIs pueden cambiar entre versiones `alpha`.
