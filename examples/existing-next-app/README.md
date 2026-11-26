# existing-next-app

**This example is outside the workspace on purpose.**

It does not appear in `pnpm-workspace.yaml` and has its own `node_modules` and
lockfile. It consumes Dashild packages from tarballs (`pnpm pack`) or from
published versions, never through `workspace:*`.

## Why

An example inside the workspace tests a monorepo. This one tests an installation:

- `exports` and subpath resolution (`@dashild/admin/server`,
  `@dashild/core/server`).
- Dependencies missing from `dependencies` because they were hoisted in the
  workspace.
- `"use client"` surviving `node_modules`.
- Incorrect `sideEffects`.
- `@/` imports that do not resolve.
- Tailwind scanning the package build (`@source`).

These are exactly the failures that make a framework look broken in a user's
first hour, and none of them show up if the example shares the workspace.

## How to test it

From the Dashild root:

```bash
pnpm build
mkdir -p ../test_dashild/tarballs
for pkg in core admin prisma cli create-dashild; do
  pnpm --filter "@dashild/$pkg" pack --pack-destination ../test_dashild/tarballs
done
```

`create-dashild` is unscoped (`--filter create-dashild`).

Then, in the example:

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

`make:resource` does not invent the policy. Add `policy` to the resource and an
entry to `src/dashild/policies.ts`; until then the runtime fails closed.

For local tarballs, pnpm 12 ignores `pnpm.overrides` in `package.json`. The
example needs a `pnpm-workspace.yaml`:

```yaml
overrides:
  "@dashild/core": "file:../tarballs/dashild-core-0.0.0.tgz"
```

Without that override, `@dashild/admin` tries to resolve `@dashild/core@0.0.0`
from the registry. Published versions do not need it.

## What was verified

- `init` writes the panel, policies, actions, icons, runtime, server actions, and
  route.
- `init` **does not modify** `app/layout.tsx`, `app/login/page.tsx`, `proxy.ts`,
  `next.config.ts`, or `src/lib/auth.ts` (checksums before/after).
- A second `init` exits with code 1 and does not overwrite anything.
- `make:resource Customer` generates the resource; `doctor` reports 0 errors.
- `/admin`, list, create, detail, and edit return 200; an unknown slug returns
  404.
- Removing `policy` from the resource returns 404; restoring it returns 200.
- The generated runtime (`src/dashild/runtime.ts`) creates, lists, updates, and
  deletes.
- `next build` compiles and Tailwind includes the installed package classes.
