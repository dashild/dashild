# Dashild

**The application admin layer for Next.js.**

> Build products, not dashboards.

Un recurso administrativo cuesta un archivo:

```bash
pnpm dashild make:resource User
```

```text
src/dashild/resources/user.ts
```

Ese archivo describe la tabla, el formulario, los filtros y las acciones. No hay
páginas que generar ni archivos que sincronizar. La seguridad (autorización y
aislamiento de datos) no vive ahí: la aplica el servidor.

**Estado: alpha.** Versión `0.1.0-alpha.6`. Todavía no es estable y la API puede cambiar entre versiones
`alpha`.

## Crear una app

```bash
pnpm create dashild@latest mi-app
```

Pregunta starter (`basic` o `demo`), autenticación, base de datos y si migrar y
sembrar. Para CI acepta flags y `--yes`:

```bash
npx create-dashild@latest mi-app \
  --template demo \
  --database postgresql \
  --database-url "$DATABASE_URL" \
  --pm pnpm \
  --yes
```

Añade `--dry-run` para ver el plan sin escribir nada y `--list-templates` para
listar los starters incluidos. La documentación completa está en el sitio de
docs y en [`apps/docs`](apps/docs).

## Documentación

El sitio vive en `apps/docs` con Astro + Starlight:

- **English (principal)**: <https://docs.dashild.dev>
- **Español (espejo)**: <https://docs.dashild.dev/es>

```bash
pnpm docs:dev      # servidor local
pnpm docs:build    # build estático en apps/docs/dist
```

El sitio está preparado para Vercel (Root Directory: `apps/docs`). Sin dominio
propio usa el subdominio `*.vercel.app`; cuando exista dominio, define
`SITE_URL` en Vercel para canonical, hreflang y sitemap.

El contenido está en `apps/docs/src/content/docs` (inglés) y
`apps/docs/src/content/docs/es` (español).

## Instalación manual

```bash
pnpm add @dashild/core@alpha @dashild/admin@alpha @dashild/prisma@alpha
pnpm add -D @dashild/cli@alpha
```

Después:

```bash
pnpm dashild init --auth better-auth
pnpm dashild make:resource User
```

Si la app ya tiene autenticación propia, usa `dashild init --auth none` y conecta
el adaptador de `src/dashild/panel.ts`.

## Qué incluye

- **Recursos como datos**: columnas, formulario, búsqueda, filtros y acciones en
  un solo archivo.
- **Relaciones**: gestores o2m/m2m en el detalle (crear, editar, eliminar,
  asociar/desasociar y attach/detach).
- **Tabla TanStack**: paginación, ordenación y filtros en servidor.
- **Campos y celdas propias**: `registerCell`/`registerField` y `dashild ui:add`
  para copiar plantillas al proyecto.
- **Bytes**: escritura en base64 con selector de archivo.
- **Políticas en servidor**: `scope` (aislamiento), `can` por acción, roles con
  `hasRole` y organización activa.
- **Better Auth**: login y signup, rate limiting, cierre de signup público,
  verificación de email y reset de contraseña (con tu proveedor de email).
- **CLI**: `init`, `make:resource`, `doctor`, `ui:add` y `eject`.
- **Bases de datos**: PostgreSQL, MySQL/MariaDB y SQLite para desarrollo.

## Base de datos

Dashild no levanta la base de datos en Docker: apunta `DATABASE_URL` a un
PostgreSQL, MySQL o SQLite que ya exista (Neon, Supabase, PlanetScale, Turso o un
archivo local). Si usas un pooler, añade `DIRECT_URL` para las migraciones.

SQLite escribe en `prisma/dev.db` por defecto. El scaffolder instala el binding
nativo con el Node que ejecuta la app para que funcione también con pnpm.

## Estructura

```text
packages/
  core/            declaraciones + lógica isomorfa (+ subpath ./server)
  admin/           runtime de cliente: shell, tabla, formulario y primitivas shadcn
  prisma/          generador oficial de Prisma (metadatos)
  cli/             binario `dashild` + plantillas copy-in
  create-dashild/  `pnpm create dashild`: scaffold interactivo o por flags

apps/
  playground/      app de desarrollo y demo; no se publica en npm
  docs/            sitio de documentación (Astro + Starlight), en/es

examples/
  existing-next-app/   FUERA del workspace: instalación real desde tarballs

docs/              puntero a la documentación; la fuente está en apps/docs
```

## Requisitos

- Node.js >= 22 (Node 20 está fuera de soporte y Prisma 7 lo rechaza).
- pnpm, npm, yarn o bun para el proyecto.
- PostgreSQL, MySQL/MariaDB o SQLite.

## Desarrollo

```bash
pnpm install
pnpm build             # compila los paquetes en orden topológico
pnpm dev               # tsc --watch en todos los paquetes
pnpm typecheck
pnpm test              # mapeo, políticas, acciones y CLI
pnpm docs:dev          # sitio de documentación en local
pnpm docs:build        # build estático del sitio
pnpm pack:all          # tarballs en artifacts/
pnpm smoke:scaffold -- --pm pnpm --database sqlite
pnpm release:verify    # comprueba que los tarballs publicados existen
```

Los paquetes publican ESM compilado con `tsc` (`module: NodeNext`). Los imports
relativos llevan extensión `.js`, también en el código fuente.

## Reglas del repo

- `packages/*` y `apps/*` viven en el workspace. `examples/*` no.
- Un paquete se justifica por una razón técnica o de distribución, no por
  estética. Hoy son cinco.
- `internal/` está en `.gitignore`: la planificación no se publica.
- El stack `@dashild/*` comparte versión; `create-dashild` puede adelantarse para
  publicar un arreglo del scaffolder sin republicar el resto.
- Todo el stack se publica con el tag `alpha`.

## Problemas comunes

- **`127.0.0.1` no hidrata en desarrollo**: Next 16 solo acepta `localhost` por
  defecto. El scaffold añade `allowedDevOrigins` para ambos; si usas otro dominio,
  añádelo a `next.config.ts`.
- **`better-sqlite3` con la ABI equivocada**: reinstala con el Node que ejecuta la
  app (`node -v`) y `npm_config_target` igual a esa versión. El scaffolder ya lo
  hace.
- **`BETTER_AUTH_URL`**: debe coincidir con el origen real (`http://localhost:3000`
  por defecto) o el login fallará por origen.

## Licencia

MIT. Consulta [`LICENSE`](LICENSE).
