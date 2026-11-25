# Instalación de Dashild (alpha)

Versión de esta guía: `0.1.0-alpha.2`.

Dashild es un panel administrativo para Next.js + Prisma. Un recurso es un
archivo de datos; no hay páginas que generar ni archivos que sincronizar.

## Requisitos

- Node.js 22 o superior.
- Next.js 15 o 16 con App Router.
- Prisma 7.10 o superior y un cliente Prisma generado con `prisma-client`.
- PostgreSQL, MySQL o MariaDB. La alpha está probada con PostgreSQL.
- Tailwind CSS v4 y shadcn/ui para el shell.

## 1. Instalar los paquetes

```bash
pnpm add @dashild/core@alpha @dashild/admin@alpha @dashild/prisma@alpha
pnpm add -D @dashild/cli@alpha
```

Los paquetes se publican con el tag `alpha`. No uses `latest` hasta que exista
una versión estable.

## 2. Configurar Prisma

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

```bash
pnpm prisma generate
pnpm prisma db push
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

Prisma 7 también funciona con SQLite o MySQL cambiando el adapter; la alpha
solo está verificada con PostgreSQL.

## 3. Montar el panel

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
src/app/<ruta>/[[...dashild]]/page.tsx
```

Con `--auth better-auth` añade además:

```text
lib/auth.ts
lib/auth-client.ts
lib/session.ts
lib/auth-actions.ts
app/api/auth/[...all]/route.ts
app/login/page.tsx
app/signup/page.tsx
components/dashild/login-form.tsx
components/dashild/signup-form.tsx
```

y, si el schema no tiene ya modelos de autenticación, añade `User`, `Session`,
`Account` y `Verification` a `prisma/schema.prisma`. También añade
`BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` a `.env.example` y la dependencia
`better-auth` a `package.json`.

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

## 4. Completar la autenticación

Con `--auth better-auth`, `src/dashild/panel.ts` ya queda conectado a la sesión
real y `/login` y `/signup` funcionan. No tienes que hacer nada más que
configurar el secreto y la URL.

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
`organizationId` y `roles` son opcionales.

Si el schema ya tenía un modelo `User` o alguno de los modelos de sesión,
`init --auth better-auth` **no lo modifica**: avisa y deja la adaptación en tus
manos. Es la vía para no romper una autenticación existente.

## 5. Tailwind

El shell vive en `@dashild/admin`. Tailwind debe escanear su build. Añade esto a
tu CSS global:

```css
@source "../node_modules/@dashild/admin/dist";
```

También necesitas las variables de tema de shadcn (`--background`,
`--foreground`, `--primary`, `--sidebar`, etc.) y las clases de tema. Puedes
partir de `apps/playground/app/globals.css` de este repositorio.

`init` no escribe CSS: el tema es decisión de la app.

## 6. Crear el primer recurso

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
Customer: {
  scope: () => ({}),
  can: {
    create: () => true,
    update: () => true,
    delete: () => true,
  },
},
```

Sin `policy` y sin entrada en `policies.ts`, el runtime **falla cerrado**. Es
intencionado.

Si no quieres que `make:resource` toque `panel.ts`/`policies.ts`, usa
`--no-register`.

## 7. Celdas y campos propios

Opcional. Crea `src/dashild/registry.tsx` en el cliente:

```tsx
"use client";

import { registerCell, registerField, registeredCells, registeredFields } from "@dashild/core";
import { RegistryProvider } from "@dashild/admin";

registerCell("avatar", AvatarCell);
registerField("email", EmailField);

export function AppRegistryProvider({ children }: { children: React.ReactNode }) {
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

Los renderers reciben `CellRendererProps`/`FieldRendererProps` de
`@dashild/admin`.

## 8. Arrancar

```bash
pnpm dev
```

El panel queda en `http://localhost:3000/admin` (o la ruta que hayas elegido).

## Limitaciones conocidas de la alpha

- `create-dashild` todavía no está publicado; usa `@dashild/cli` manualmente.
- `init --auth better-auth` añade modelos de autenticación si el schema está
  vacío; si ya existen, solo avisa y no los duplica.
- El ámbito se aplica en el runtime y en la extensión `withDashildScope` de
  Prisma. Las relaciones incluidas dentro de una consulta no son consultas
  separadas; para cargas personalizadas usa `runtime.client(user)` o el cliente
  extendido.
- Relaciones m2m: multiselect en el formulario. o2m requiere un gestor de hijos
  específico porque la FK puede ser obligatoria y no se puede desconectar con
  un `set` genérico.
- `Bytes`: se edita con un selector de archivo y viaja como base64.
- El sistema de acciones y el mapa de iconos están documentados en los README
  de los paquetes, pero la documentación pública todavía es mínima.
- Las APIs pueden cambiar entre versiones `alpha`.
