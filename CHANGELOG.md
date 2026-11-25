# Changelog

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
