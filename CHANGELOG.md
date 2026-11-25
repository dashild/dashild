# Changelog

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
