# Changelog

## 0.1.0-alpha.11 — 2026-11-27

- Filter bar: declared filters render as controls (enum, relation, boolean,
  text, number, date) and submit a GET form; options are resolved per user.
- Tenancy is a first-class option: `dashild init --tenancy` and
  `create-dashild --tenancy` add the Organization model, `User.organizationId`
  and `role`, an organization-aware session, the switch action, and the sidebar
  switcher.
- New `saas` starter: organizations, members, and projects isolated by tenant,
  with a seed for two organizations.
- Docs: Multi-tenancy guide and Server API reference (English and Spanish).
- SQLite smoke now opens the seeded `dev.db` to prove the Prisma CLI and the
  adapter resolved the same file.
- Multi-tenant veterinary clinic example in `examples/vet-clinic`: two clinics,
  roles, relations, actions, filters, and a custom cell, with a step-by-step
  tutorial in the docs.

## 0.1.0-alpha.10 — 2026-11-27

- Docs logo split into three assets: `logo.svg` (currentColor, inline),
  `logo-light.svg` and `logo-dark.svg` for `<img>` usage. The D is a cutout, so
  it always takes the background color.
- The panel renders `brand.logo` in the sidebar and falls back to the Dashild
  mark, which inherits the theme text color.

## 0.1.0-alpha.9 — 2026-11-26

Documentation audit fixes and the code gaps behind them.

- Docs (English and Spanish) corrected across all eight pages: valid
  `definePolicies` examples, `withDashildScope` import, `prisma generate`
  before `init`, registry casts, real scope coverage, `tone`/`format` values,
  no filter UI, `table.actions` replacing the built-ins, template reapplication
  and pinning semantics, conditional env keys, and complete CLI flags/exits.
- `dashild doctor` recognizes the `resourceActions.Model = { ... }`
  assignments that `dashild make:action` writes (no more false missing-handler
  error).
- `dashild init` generates a theme switch that works: the mount route reads the
  `dashild_theme` cookie and passes `toggleTheme`, which cycles
  light → dark → system.
- Client form validation follows the panel `locale`.
- `format: "number"` formats with the panel locale.
- `ui:add` prints the concrete registration call (`registerCell("avatar",
  AvatarCell)`) and skips unknown names.
- A template's `env` keys are appended to `.env.example`.
- Landing copy no longer promises migrated and seeded data.

## 0.1.0-alpha.8 — 2026-11-26

- Documentation site with Astro + Starlight: English primary, Spanish mirror,
  Pagefind search, language picker, edit links, sitemap, and a CI build.
- New product landing (monochrome, Geist/JetBrains Mono) and a monochrome docs
  theme with the same logo mark. Deployed at <https://dashild.vercel.app> and
  `/es`.
- All READMEs rewritten in English.
- MySQL 8.4 verified end-to-end (scaffold, migrate, seed, build) and added to the
  CI scaffold matrix.
- `dashild make:action <Model> <action>` appends a typed handler stub without
  touching the write-once resource.
- Scalar lists (`String[]`, `Int[]`...) are supported as JSON arrays in tables
  and forms.
- `format: "currency"` with an ISO code renders Decimal money correctly.
- `theme.defaultMode` accepts `system` and follows `prefers-color-scheme`.
- Save and delete show success toasts after the server redirect.
- `pnpm release:bump <version>` keeps package versions and `dashildPackages` in
  sync.

## 0.1.0-alpha.6 — 2026-11-26

- `@dashild/core`: `CurrentUser` acepta `organizationId` y `roles`; las
  políticas los usan cuando no hay `organizationOf`/`rolesOf`. Nuevo `hasRole`.
- `@dashild/cli`: `eject` implementado. `init --auth better-auth` añade rate
  limiting, cierre de signup con `ALLOW_SIGNUP`, verificación por entorno y
  reset de contraseña (`/forgot-password`, `/reset-password`) con un stub de
  email.
- `create-dashild` genera las nuevas páginas de auth y publica el stack
  `0.1.0-alpha.6`.
- CI: scaffold smoke con npm/pnpm y SQLite/PostgreSQL hasta `next build`;
  `release:verify` comprueba los tarballs publicados.
- READMEs y guía de instalación actualizados en español.


## 0.1.0-alpha.5 — 2026-11-25

- `create-dashild` instala dependencias con el Node que ejecuta el CLI y con
  `npm_config_target`, para que `better-sqlite3` reciba el binario correcto
  también con pnpm (que no incluye `node-gyp`). Las apps generadas siguen
  fijando el stack `0.1.0-alpha.4`.
- Usa una pila de fuentes del sistema en `--font-sans`; la variable
  autoreferenciada dejaba la app en Times New Roman.
- `next.config.ts` incluye `allowedDevOrigins` para que `127.0.0.1` también
  hidrate en desarrollo.
- `create-dashild` solo anuncia los pasos que realmente ejecuta.

## 0.1.0-alpha.4 — 2026-11-25

- Reemplaza a `0.1.0-alpha.3`: su publicación quedó incompleta (falta el
  tarball de `@dashild/core`).
- Nuevo `create-dashild` (`npm create dashild`): scaffold interactivo o por
  flags sobre `create-next-app`, starters `basic`/`demo`, Better Auth y
  PostgreSQL, MySQL o SQLite, con migración y seed opcionales.
- `@dashild/cli` expone `./init` y `./register` para planificar el scaffold
  antes de `prisma generate`.
- El registro de recursos conserva la indentación y ya no deja huecos en
  `resources`.
- `make:resource` registra el recurso en `panel.ts` y una política fail-closed
  en `policies.ts`; `--no-register` lo desactiva.
- `doctor` comprueba la entrada del modelo en `policies.ts`, los handlers de
  acciones y los predicados `requires`.
- `withDashildScope` aplica el ámbito a consultas directas de Prisma; el runtime
  usa el cliente extendido y expone `runtime.client(user)`.
- `registerCell`/`registerField` con `RegistryProvider`: celdas y campos propios
  en cliente, referenciados desde el recurso con `cell` y `component`.
- `ui:add` copia plantillas de celda/campo.
- Tabla con TanStack Table (paginación, ordenación y filtros siguen en servidor).
- Escritura de `Bytes` mediante base64 y selector de archivo.
- Relation manager o2m/m2m en el detalle: crear/editar/eliminar,
  asociar/desasociar (solo si la FK es opcional) y attach/detach.

## 0.1.0-alpha.2 — 2026-11-25

- `dashild init --auth better-auth` genera login, signup, API handler, sesión y adaptador del panel.
- Añade los modelos de Better Auth al schema si no existen y avisa si ya hay autenticación.
- Añade `better-auth` a `package.json` y las claves de entorno a `.env.example`.
- Si el schema ya tiene `User`/`Session`/`Account`/`Verification`, no lo modifica.

## 0.1.0-alpha.1 — 2026-11-25

- El generador de Prisma informa de su versión real (`pkg.version`) en lugar de `0.0.0`.

## 0.1.0-alpha.0 — 2026-11-25

Primera alpha pública.

- `@dashild/core`: declaraciones, mapeo Prisma, políticas y runtime de datos en `./server`.
- `@dashild/admin`: shell, tabla, formulario, detalles, acciones, iconos y primitivas shadcn.
- `@dashild/prisma`: generador `dashild-prisma-generator`.
- `@dashild/cli`: `init`, `make:resource` y `doctor`.
- Aislamiento por ámbito y permisos con fallo cerrado.
- Instalación desde tarballs verificada en `examples/existing-next-app`.

Limitaciones conocidas:

- `create-dashild` no está publicado.
- `make:resource` no registra el recurso en `panel.ts` ni en `policies.ts`.
- El ámbito se aplica en el runtime, no todavía en una extensión `$extends` de Prisma.
