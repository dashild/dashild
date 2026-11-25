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

**Estado: alpha.** Versión `0.1.0-alpha.2`, todavía no estable. La API puede
cambiar entre versiones `alpha`.

## Instalación

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

La guía completa, requisitos de Prisma 7, Tailwind y autenticación está en
[`docs/install.md`](docs/install.md).

## Estructura

```text
packages/
  core/            declaraciones + lógica isomorfa (+ subpath ./server)
  admin/           runtime de cliente: shell, tabla, formulario y primitivas shadcn
  prisma/          generador oficial de Prisma (metadatos)
  cli/             binario `dashild` + plantillas copy-in
  create-dashild/  `pnpm create dashild` (aún no publicado)

apps/
  playground/      app de desarrollo y demo; no se publica en npm

examples/
  existing-next-app/   FUERA del workspace: instalación real desde tarballs

docs/              documentación pública: instalación y guías
```

## Requisitos

- Node.js >= 22 (Node 20 está fuera de soporte y Prisma 7 lo rechaza)
- pnpm

## Desarrollo

```bash
pnpm install
pnpm build        # compila los paquetes en orden topológico
pnpm dev          # tsc --watch en todos los paquetes
pnpm typecheck
pnpm test         # especificación ejecutable de la tabla de mapeo
```

Los paquetes publican ESM compilado con `tsc` (`module: NodeNext`). Los imports
relativos llevan extensión `.js`, también en el código fuente.

## Reglas del repo

- `packages/*` y `apps/*` viven en el workspace. `examples/*` no.
- Un paquete se justifica por una razón técnica o de distribución, no por
  estética. Hoy son cinco.
- `internal/` está en `.gitignore`: la planificación no se publica.
- Versionado lockstep: todos los paquetes comparten versión.
- `@dashild/core`, `@dashild/admin`, `@dashild/prisma` y `@dashild/cli` se publican con tag `alpha`; `create-dashild` sigue privado.

## Licencia

MIT. Consulta [`LICENSE`](LICENSE).
