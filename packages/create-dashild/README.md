# create-dashild

Creates a Next.js app with Dashild preconfigured: panel, Prisma, authentication,
and an optional starter, ready for `dev`.

```bash
pnpm create dashild@latest my-app
# or, without installing:
npx create-dashild@latest my-app
```

## Interactive mode

Without flags it asks, in this order:

1. Project name and folder.
2. Starter: `basic` (panel only), `demo` (users, posts, and labels), or `saas`
   (organizations and projects, isolated by tenant).
3. Authentication: Better Auth (email + password) or none.
4. Database: PostgreSQL, MySQL, or SQLite, and its `DATABASE_URL`.
5. Install dependencies, initialize git, migrate, and seed.

The panel lives at `/admin` by default.

## Flags

```bash
npx create-dashild@latest my-app \
  --template demo \
  --database postgresql \
  --database-url "$DATABASE_URL" \
  --pm pnpm \
  --yes
```

| Flag | Values |
| --- | --- |
| `--template` | `basic`, `demo`, `saas`, `local:<path>`, `github:<owner>/<repo>#<ref>` |
| `--auth` | `better-auth`, `none` |
| `--database` | `postgresql`, `mysql`, `sqlite` |
| `--database-url` | Connection URL; the engine is inferred from it |
| `--direct-url` | Non-pooled URL for migrations |
| `--pm` | `pnpm`, `npm`, `yarn`, `bun` |
| `--path` | Panel route (defaults to `/admin`) |
| `--no-install` | Skip dependency installation |
| `--no-git` | Skip git initialization |
| `--no-migrate` | Do not apply the schema |
| `--no-seed` | Do not load starter data |
| `--tenancy` | Add organizations, a tenant-aware session, and the sidebar switcher (Better Auth) |
| `--dry-run` | Print the plan without writing anything |
| `--list-templates` | List the bundled starters |
| `-y, --yes` | Accept the defaults |

The database is not started in Docker: point `DATABASE_URL` at an existing
PostgreSQL, MySQL, or SQLite database (Neon, Supabase, PlanetScale, a local
file…). If the database is unreachable, the project is still created and the
migration and seed commands are printed as pending steps.

## Starters

A starter is a folder with `template.json` and project files:

```json
{
  "name": "my-starter",
  "version": "1.0.0",
  "dashild": ">=0.1.0-alpha.10",
  "prisma": { "provider": ["postgresql"] },
  "requires": { "auth": ["better-auth"] },
  "extend": { "User": ["role Role @default(USER)"] }
}
```

- `prisma/models.prisma` is appended to the schema with markers so it is not
  duplicated.
- `extend` adds fields to models that already exist (for example `User`).
- `src/dashild/resources/*.ts` are copied and registered in `panel.ts`.
- `src/dashild/policies.ts` replaces the default policies.
- `prisma/seed.ts` runs with `--seed`.

Only bundled starters, local ones (`local:`), and GitHub ones (`github:`) are
loaded. npm templates are not supported in this version.

## Monorepo development

```bash
pnpm --filter create-dashild build
pnpm --filter create-dashild test
node packages/create-dashild/dist/index.js my-app --dry-run
```

`package.json` `dashildPackages` pins the `@dashild/*` version that generated
apps install. It lets a scaffolder fix ship without republishing the whole stack.

To test the full scaffolder before publishing:

```bash
pnpm build && pnpm pack:all
DASHILD_PACKAGES_FROM=$PWD/artifacts pnpm smoke:scaffold -- --pm pnpm --database sqlite
```

`DASHILD_PACKAGES_FROM` makes dependencies resolve from those tarballs instead
of npm.
