# @dashild/cli

The `dashild` binary.

## `make:resource <Model>`

```bash
pnpm dashild make:resource Organization
```

Reads `dashild-metadata.json`, uses **the `@dashild/core` mapping table**, and
writes a single file:

```text
src/dashild/resources/organization.ts
```

- **Write-once**: if the file exists, it is not overwritten. The resource belongs
  to the developer.
- Omits `id`, `@updatedAt`, and foreign keys written by a relation. Scalar
  lists (`String[]`, `Int[]`...) are included as a JSON array.
- Includes `Bytes` in the form and m2m relations as a multiselect. o2m is not
  generated as a field: it is handled by the parent relation manager, and the
  child model needs its own resource.
- Generates columns, form fields, search, and filters from metadata.
- Audit fields (`createdAt`, `updatedAt`, `deletedAt`) appear in the table but
  not in the form.
- Labels and slugs derive from the model (`BlogPost` → `blog-post.ts`,
  `Blog Posts`, `blog-posts`); edit them afterwards.
- By default it adds the resource to `panel.resources` and a **fail-closed**
  entry to `policies.ts` (`scope: () => null`). Edit that entry to define the
  scope and permissions.
- `--no-register` leaves `panel.ts` and `policies.ts` untouched.

Options:

| Option | Purpose |
| --- | --- |
| `--cwd <dir>` | Project root (defaults to the current directory) |
| `--metadata <path>` | Explicit `dashild-metadata.json` |
| `--dir <path>` | Resources folder (defaults to `src/dashild/resources`) |
| `--no-register` | Do not add the resource to `panel.ts` or `policies.ts` |
| `--dry-run` | Print the file without writing it |

Default metadata paths: `src/generated/dashild/`, `generated/dashild/`, and
`prisma/generated/dashild/`.

## `make:action <Model> <action>`

```bash
pnpm dashild make:action Customer export
```

Appends a typed handler stub to `src/dashild/actions/index.ts`:

```ts
resourceActions.Customer = {
  ...resourceActions.Customer,
  export: async (_context) => ({
    ok: true,
    message: "TODO: implement Customer.export",
  }),
};
```

It does not touch the resource (write-once): declare the action in
`table.actions` or `form.actions` yourself. Running it twice does not duplicate
the handler. Options: `--cwd`, `--dir` (actions folder).

## `init`

```bash
pnpm dashild init --auth better-auth
pnpm dashild init --auth better-auth --yes
pnpm dashild init --auth none --yes
pnpm dashild init --dry-run
```

Adds the panel to an existing Next.js app. It writes only the app glue:

```text
src/dashild/panel.ts          configuration and auth adapter to complete
src/dashild/policies.ts       fail-closed policies, no resources
src/dashild/actions/index.ts  handler registry
src/dashild/icons.tsx         IconProvider + custom icons
src/dashild/runtime.ts        Prisma + metadata + panel + policies
src/dashild/server.ts         server actions (save/delete/action)
src/dashild/registry.tsx      RegistryProvider for custom cells/fields
src/app/<route>/[[...dashild]]/page.tsx
```

With `--auth better-auth` it also writes:

```text
src/lib/auth.ts
src/lib/auth-client.ts
src/lib/session.ts
src/lib/auth-actions.ts
src/lib/email.ts
src/app/api/auth/[...all]/route.ts
src/app/login/page.tsx
src/app/signup/page.tsx
src/app/forgot-password/page.tsx
src/app/reset-password/page.tsx
src/components/dashild/login-form.tsx
src/components/dashild/signup-form.tsx
src/components/dashild/forgot-password-form.tsx
src/components/dashild/reset-password-form.tsx
```

It adds `better-auth` to `package.json` and the `User`, `Session`, `Account`, and
`Verification` models to `prisma/schema.prisma` when they are missing. It also
adds `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ALLOW_SIGNUP`,
`REQUIRE_EMAIL_VERIFICATION`, `RESEND_API_KEY`, and `EMAIL_FROM` to
`.env.example`.

The generated configuration enables rate limiting (100/minute), lets you close
public signup with `ALLOW_SIGNUP="false"`, requires verification with
`REQUIRE_EMAIL_VERIFICATION="true"`, and mounts the password reset flow.
`src/lib/email.ts` sends through Resend when `RESEND_API_KEY` is set; otherwise
it logs the email in development and throws in production.

It adds the `dashild` script to `package.json` if missing. **It does not touch**
`middleware.ts`/`proxy.ts`, the root layout, `next.config`, `.env`, or the auth
files.

- `--auth <none|better-auth>` picks the integration. It defaults to `none` so an
  existing auth setup is not touched.
- `--path <route>` picks the mount route. If `/admin` already has a `page.tsx`,
  it proposes `/panel`, `/admin-panel`, or `/dashild`.
- `--yes` writes; without it, it only prints the plan. `--dry-run` never writes.
- `--tenancy` adds the `Organization` model, `User.organizationId`/`role`, an
  organization-aware session, the switch action, and the sidebar switcher. It
  requires `--auth better-auth` and a schema without auth models; see
  [Multi-tenancy](https://dashild.vercel.app/guides/multi-tenancy/).
- `--force` overwrites existing files. Without `--force`, it refuses to clobber
  manual work.
- It warns when a Prisma client or a Dashild dependency is missing.

## `ui:add <component>`

```bash
pnpm dashild ui:add avatar-cell
pnpm dashild ui:add email-field
```

Copies a template to `components/dashild/` (or `--dir`). Available templates:

- `avatar-cell`: initials cell.
- `email-field`: email field with help text.

It does not edit `registry.tsx`: it prints the `registerCell`/`registerField`
call you need to add. Options: `--cwd`, `--dir`, `--force`, `--dry-run`.

## `doctor`

```bash
pnpm dashild doctor
pnpm dashild doctor --json
```

Parses `src/dashild/resources/*.ts` (without importing them: `panel.ts` pulls in
Next) and compares them with `dashild-metadata.json`:

- model and `navigation.slug`,
- columns, filters, and form fields,
- relations and their `display`,
- read-only fields in the form,
- a `policy` with a `scope`,
- the model entry in `policies.ts`,
- custom action handlers in `actions/index.ts`,
- action `requires` predicates in `policies.ts`,
- duplicate slugs.

It reports file and line, suggests the fix, and exits with code 1 on errors.
`--json` is for CI.

## `eject`

```bash
pnpm dashild eject
pnpm dashild eject --yes
```

Removes what `init` wrote: `panel.ts`, `policies.ts`, `actions/index.ts`,
`icons.tsx`, `runtime.ts`, `server.ts`, `registry.tsx`, the mount route, and the
`dashild` script in `package.json`. It does not touch resources, auth, the schema,
or dependencies; it lists them as “Kept”.

Without `--yes` it only prints the plan. Use `--path` if it cannot read the route
from `panel.ts`, and `--dry-run` to force simulation.

## Commands

| Command | Status |
| --- | --- |
| `init` | Working |
| `make:resource` | Working |
| `make:action` | Working |
| `doctor` | Working |
| `ui:add` | Working |
| `eject` | Working |

## Tests

```bash
pnpm --filter @dashild/cli test
```

They cover `make:resource`, `make:action`, `doctor`, `init`, `ui:add`, `register`, and `eject`
with synthetic projects and metadata: navigation, columns, form, filters,
omissions, names, write plan, route conflict, resource registration, and
fail-closed behavior.
