# Dashild

**The application admin layer for Next.js.**

> Build products, not dashboards.

An admin resource costs one file:

```bash
pnpm dashild make:resource User
```

```text
src/dashild/resources/user.ts
```

That file describes the table, form, filters, and actions. There are no pages to
generate and no files to keep in sync. Security (authorization and data
isolation) does not live there: the server enforces it.

**Status: alpha.** Version `0.1.0-alpha.10`. It is not stable yet and the API may
change between `alpha` releases.

## Create an app

```bash
pnpm create dashild@latest my-app
```

It asks for the starter (`basic` or `demo`), authentication, database, and
whether to migrate and seed. For CI it accepts flags and `--yes`:

```bash
npx create-dashild@latest my-app \
  --template demo \
  --database postgresql \
  --database-url "$DATABASE_URL" \
  --pm pnpm \
  --yes
```

Add `--dry-run` to print the plan without writing anything, and
`--list-templates` to list the bundled starters. The full documentation is on
the docs site and in [`apps/docs`](apps/docs).

## Documentation

The site lives in `apps/docs` (Astro + Starlight):

- **English (primary)**: <https://dashild.vercel.app>
- **Spanish (mirror)**: <https://dashild.vercel.app/es>

```bash
pnpm docs:dev      # local server
pnpm docs:build    # static build in apps/docs/dist
```

It is ready for Vercel (Root Directory: `apps/docs`). Without a custom domain it
uses the `*.vercel.app` subdomain; when you have one, set `SITE_URL` in Vercel for
canonical URLs, hreflang, and the sitemap.

Content lives in `apps/docs/src/content/docs` (English) and
`apps/docs/src/content/docs/es` (Spanish).

## Manual installation

```bash
pnpm add @dashild/core@alpha @dashild/admin@alpha @dashild/prisma@alpha
pnpm add -D @dashild/cli@alpha
```

Then:

```bash
pnpm dashild init --auth better-auth
pnpm dashild make:resource User
```

If the app already has its own auth, use `dashild init --auth none` and connect
the adapter in `src/dashild/panel.ts`.

## What it includes

- **Resources as data**: columns, form, search, filters, and actions in one file.
- **Relations**: o2m/m2m managers in the detail page (create, edit, delete,
  associate/detach, and attach/detach).
- **TanStack table**: server-side pagination, sorting, and filters.
- **Custom cells and fields**: `registerCell`/`registerField` and
  `dashild ui:add` to copy templates into the project.
- **Bytes**: base64 writes with a file picker.
- **Server policies**: `scope` (isolation), per-action `can`, roles with
  `hasRole`, and the active organization.
- **Better Auth**: login and signup, rate limiting, public signup gate, email
  verification, and password reset (with your email provider).
- **CLI**: `init`, `make:resource`, `doctor`, `ui:add`, and `eject`.
- **Databases**: PostgreSQL, MySQL/MariaDB, and SQLite for development.

## Database

Dashild does not start the database in Docker: point `DATABASE_URL` at a
PostgreSQL, MySQL, or SQLite database that already exists (Neon, Supabase,
PlanetScale, Turso, or a local file). If you use a pooler, add `DIRECT_URL` for
migrations.

SQLite writes to `prisma/dev.db` by default. The scaffolder installs the native
binding with the Node that runs the app so it also works with pnpm.

## Structure

```text
packages/
  core/            declarations + isomorphic logic (+ ./server subpath)
  admin/           client runtime: shell, table, form, and shadcn primitives
  prisma/          official Prisma generator (metadata)
  cli/             `dashild` binary + copy-in templates
  create-dashild/  `pnpm create dashild`: interactive or flag-driven scaffolder

apps/
  playground/      development and demo app; not published to npm
  docs/            documentation site (Astro + Starlight), en/es

examples/
  existing-next-app/   OUTSIDE the workspace: real install from tarballs

docs/              pointer to the docs; the source lives in apps/docs
```

## Requirements

- Node.js >= 22 (Node 20 is out of support and Prisma 7 rejects it).
- pnpm, npm, yarn, or bun for the project.
- PostgreSQL, MySQL/MariaDB, or SQLite.

## Development

```bash
pnpm install
pnpm build             # build packages in topological order
pnpm dev               # tsc --watch in every package
pnpm typecheck
pnpm test              # mapping, policies, actions, and CLI
pnpm docs:dev          # local docs site
pnpm docs:build        # static docs build
pnpm pack:all          # tarballs in artifacts/
pnpm smoke:scaffold -- --pm pnpm --database sqlite
pnpm release:verify    # check that the published tarballs exist
```

Packages publish ESM compiled with `tsc` (`module: NodeNext`). Relative imports
include the `.js` extension, including in source.

## Repository rules

- `packages/*` and `apps/*` live in the workspace. `examples/*` do not.
- A package must be justified by a technical or distribution reason, not
  aesthetics. Today there are five.
- `internal/` is gitignored: planning is not published.
- The `@dashild/*` stack shares a version; `create-dashild` may move ahead to
  ship a scaffolder fix without republishing the rest.
- The whole stack is published with the `alpha` tag.

## Troubleshooting

- **`127.0.0.1` does not hydrate in development**: Next 16 only allows
  `localhost` by default. The scaffold adds `allowedDevOrigins` for both; add any
  other domain to `next.config.ts`.
- **`better-sqlite3` with the wrong ABI**: reinstall with the Node that runs the
  app (`node -v`) and `npm_config_target` set to that version. The scaffolder
  already does this.
- **`BETTER_AUTH_URL`**: it must match the real origin (`http://localhost:3000`
  by default) or sign-in fails with an origin error.

## License

MIT. See [`LICENSE`](LICENSE).
