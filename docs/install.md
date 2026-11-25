# Instalación de Dashild (alpha)

Versión de esta guía: `0.1.0-alpha.0`.

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

```bash
pnpm dashild init
```

El comando muestra el plan y no escribe nada hasta que añadas `--yes`:

```bash
pnpm dashild init --yes
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

No toca `middleware.ts`/`proxy.ts`, el layout raíz, `next.config`, `.env` ni tus
archivos de autenticación.

Si ya existe `app/admin/page.tsx`, `init` elige `/panel`, `/admin-panel` o
`/dashild`. Usa `--path /otra-ruta` para forzarla y `--dry-run` para revisar el
plan.

## 4. Completar la autenticación

`init` deja un adaptador vacío en `src/dashild/panel.ts`:

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

`make:resource` escribe un archivo y **no lo vuelve a tocar**. En la alpha:

1. Añade la entrada a `panel.resources` en `src/dashild/panel.ts`.
2. Añade `policy` al recurso:

   ```ts
   policy: { scope: "all" },
   ```

3. Añade la entrada correspondiente en `src/dashild/policies.ts`:

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

Sin `policy` y sin entrada en `policies.ts`, el recurso **falla cerrado** y el
panel devuelve 404. Es intencionado.

## 7. Arrancar

```bash
pnpm dev
```

El panel queda en `http://localhost:3000/admin` (o la ruta que hayas elegido).

## Limitaciones conocidas de la alpha

- `create-dashild` todavía no está publicado; usa `@dashild/cli` manualmente.
- `make:resource` no registra el recurso ni la política automáticamente.
- El ámbito aún se aplica en el runtime, no en una extensión `$extends` de
  Prisma.
- El sistema de acciones y el mapa de iconos están documentados en los README
  de los paquetes, pero la documentación pública todavía es mínima.
- Las APIs pueden cambiar entre versiones `alpha`.
