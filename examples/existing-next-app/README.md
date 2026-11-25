# existing-next-app

**Este example está fuera del workspace a propósito.**

No aparece en `pnpm-workspace.yaml` y tiene su propio `node_modules` y lockfile.
Consume los paquetes de Dashild desde tarballs (`pnpm pack`) o desde versiones
publicadas, nunca por `workspace:*`.

## Por qué

Un example dentro del workspace prueba un monorepo. Este prueba una instalación:

- Resolución de `exports` y subpaths (`@dashild/admin/server`, `@dashild/core/server`).
- Dependencias que faltan en `dependencies` porque en el workspace estaban hoisteadas.
- `"use client"` sobreviviendo a `node_modules`.
- `sideEffects` mal puesto.
- Imports `@/` que no se resuelven.
- Tailwind escaneando el build del paquete (`@source`).

Son exactamente los fallos que hacen que un framework parezca roto en la primera
hora de un usuario, y ninguno aparece si el example comparte el workspace.

## Cómo se prueba

Desde la raíz de Dashild:

```bash
pnpm build
mkdir -p ../test_dashild/tarballs
for pkg in core admin prisma cli create-dashild; do
  pnpm --filter "@dashild/$pkg" pack --pack-destination ../test_dashild/tarballs
done
```

`create-dashild` no lleva scope (`--filter create-dashild`).

Después, en el example:

```bash
pnpm install
pnpm prisma:generate
pnpm db:push
pnpm db:seed
pnpm dashild init --yes
pnpm dashild make:resource Customer
pnpm dashild doctor
pnpm build
```

`make:resource` no inventa la política. Hay que añadir `policy` al recurso y una
entrada en `src/dashild/policies.ts`; hasta entonces el runtime falla cerrado.

Para tarballs locales, pnpm 12 ignora `pnpm.overrides` de `package.json`. El
example necesita un `pnpm-workspace.yaml`:

```yaml
overrides:
  "@dashild/core": "file:../tarballs/dashild-core-0.0.0.tgz"
```

Sin ese override, `@dashild/admin` intenta resolver `@dashild/core@0.0.0` en el
registro. Con versiones publicadas no hace falta.

## Qué se verificó

- `init` escribe panel, políticas, actions, iconos, runtime, server actions y ruta.
- `init` **no modifica** `app/layout.tsx`, `app/login/page.tsx`, `proxy.ts`,
  `next.config.ts` ni `src/lib/auth.ts` (checksums antes/después).
- Un segundo `init` sale con código 1 y no sobrescribe.
- `make:resource Customer` genera el recurso; `doctor` da 0 errores.
- `/admin`, listado, creación, detalle y edición responden 200; slug desconocido 404.
- Quitar `policy` del recurso devuelve 404; restaurarla devuelve 200.
- El runtime creado (`src/dashild/runtime.ts`) crea, lista, actualiza y borra.
- `next build` compila y Tailwind incluye las clases del paquete instalado.
