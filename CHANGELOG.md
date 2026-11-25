# Changelog

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
