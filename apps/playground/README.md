# playground

A Next.js 16 app that **pretends it already existed**. It is the demo and
development environment for the panel; it is not published to npm.

The rule is simple: everything you see here belonged to the app before Dashild.
If a piece exists only to make Dashild work, it is in the wrong place.

## UI stack

- **Tailwind CSS v4 + shadcn/ui** (preset `radix-nova`, Radix base, `lucide`
  icons).
- shadcn primitives live in `@dashild/admin/ui/*`; the app imports them from
  there. The shell is also in `@dashild/admin`.
- `components/dashild/` only keeps what belongs to this app: login, signup, the
  auth layout, and the `IconProvider`.
- Tailwind scans the package build with `@source` in `app/globals.css`; there is
  no custom CSS.
- No `space-y-*`, raw colors, or `size-4` icons inside a component that already
  sizes them.

## Authentication: Better Auth

Better Auth 1.7 with the Prisma adapter, email and password.

```text
lib/auth.ts                       server configuration
lib/auth-client.ts                login/signup client
lib/auth-actions.ts               signOut, theme, and organization switch
app/api/auth/[...all]/route.ts    Better Auth handler
lib/session.ts                    getCurrentUser (session + domain fields)
```

- User ids are UUIDs (`advanced.database.generateId`) because `User.id` is
  `@db.Uuid`.
- The proxy only checks for the presence of `better-auth.session_token`; every
  page performs the real check with `auth.api.getSession`.
- A newly registered user has no organization: the panel shows the dashboard,
  but data isolation hides rows until they belong to one.
- Demo credentials (after `db:seed`): `ana@acme.test` / `dashild123`. Also
  `bruno@beta.test` and `carla@acme.test`.

## Panel

- `/admin` — `sidebar-07` shell: organization switcher, collapsible groups and
  resources, header, theme, and an empty dashboard when there are no resources.
- `/admin/users` — the User resource.
- `/login` and `/signup` — `login-02` and `signup-02` blocks adapted to Better
  Auth.
- `src/dashild/panel.ts` — route, brand, theme (`defaultMode`, `toggle`,
  `primary`), sidebar, content width, resources, `locale`, and auth.
- `locale: "es"` enables the Spanish core catalog; the framework defaults to
  English. Resource labels remain app data.
- The theme is stored in the `dashild_theme` cookie and applied as `.dark` on the
  panel container, not on `<html>`: Dashild does not touch the root layout.

### `src/dashild` structure

```text
panel.ts        panel configuration (edit)
policies.ts     security: scopes and permissions (edit)
icons.tsx       icon overrides (optional)
resources/      one file per resource (edit)
actions/        custom handlers: index.ts + <model>.ts (edit when there are actions)
runtime.ts      Prisma + metadata + panel + policies
server/         metadata.ts, read.ts, write.ts (server runtime, do not edit)
```

The rule: **top is yours; `server/` is glue you should not touch**. The shell,
table, form, and client Zod live in `@dashild/admin`; `lib/auth-actions.ts` is
app authentication, not resource handlers.

### Icons and groups

`navigation.group` places a resource in a sidebar group. `navigation.icon`
accepts a name from the base map in
`packages/admin/src/components/nav-main.tsx` (`users`, `building`, `file-text`,
`settings`, `database`, `folder`, `chart`, `package`, `shopping-cart`, `tag`,
`calendar`, `mail`, `briefcase`, `credit-card`, `truck`, `layers`) **or one
declared in `src/dashild/icons.tsx`**:

```ts
import { Rocket } from "lucide-react";

export const icons = { rocket: Rocket };
```

There is no command for this: it is an app file, like `panel.ts`. An unknown name
does not break the panel: it falls back to `Table2` and warns in the console in
development.

### CRUD

- `/admin/<slug>/create` — create form.
- `/admin/<slug>/<id>` — record detail.
- `/admin/<slug>/<id>/edit` — edit form.
- Row `...` menu with View, Edit, and Delete; delete asks for confirmation.
- Client validation with React Hook Form + Zod and authoritative validation on
  the server.
- Translated Prisma errors: P2002 to unique field, P2003 to relation,
  P2025/P2007 to "does not exist".

`pnpm --filter playground db:write-smoke` creates, updates, and deletes a user
through the same path as the server action.

### Custom cells and fields

`src/dashild/registry.tsx` registers `avatar` as a cell and `email` as a field.
The resource uses them with `cell: "avatar"` and `component: "email"`.
`AppRegistryProvider` wraps `AdminPage` in the route.

### Actions

Defaults: `create`, `view`, `edit`, `delete` in the table and `save`, `cancel` in
the form. Declaring `table.actions` or `form.actions` **replaces** the list: if
you omit `delete`, it disappears.

Custom handlers live in `src/dashild/actions/<model>.ts` and are registered in
`actions/index.ts`:

```ts
// src/dashild/actions/user.ts
import type { ActionHandler } from "@dashild/core";

export const actions = {
  export: async ({ id }) => ({ ok: true, message: "Exported." }),
} satisfies Record<string, ActionHandler>;
```

```ts
// src/dashild/resources/user.ts
table: {
  actions: [
    { name: "create", placement: "header" },
    { name: "export", placement: "header", label: "Export Excel" },
    { name: "view" },
    { name: "edit" },
  ],
},
```

`runResourceAction` resolves the resource from the panel, checks the session,
validates that the action is declared, and finds the handler. Logic never crosses
to the client; the resource only carries data.

### Isolation

- `src/dashild/policies.ts` defines `organizationOf`/`rolesOf` and, per resource,
  a `scope` (a `where` fragment) and `can` (permissions).
- A resource without `policy` or without an entry in `policies.resources` **fails
  closed**: list, detail, and writes return denied/404.
- The scope applies to list, `count`, detail, update, and delete; relation options
  are filtered by the active organization.
- `can.create`/`can.update` prevent moving records to another organization;
  `can.delete` restricts deletion and the UI hides the button when it is false.
- The active organization comes from the switcher cookie, validated on the
  server.

`pnpm --filter playground db:security-smoke` checks A/B with Ana (org-1 admin),
Bruno (org-2), and Carla (org-1): lists, detail, organizations, form options,
permissions, and fail-closed behavior.

`pnpm --filter playground db:scope-smoke` tests the `withDashildScope` extension
with direct Prisma queries: Ana cannot see or modify Bruno's rows. It is the
second barrier for code that does not go through the runtime.

`pnpm --filter playground db:bytes-smoke` checks `Bytes` writes (base64 ↔
`Uint8Array`). `db:relations-smoke` checks the relation manager: lists o2m/m2m
children, blocks associate/detach on o2m with a required FK, and allows
attach/detach on m2m.

The user detail page shows the `posts` and `labels` relation managers, with
create/edit/delete and the actions allowed by the policy.

### Organization switcher

The `sidebar-07` team switcher is the organization selector. The
`dashild_organization` cookie is validated on the server on every request:

- `ADMIN`: can switch to any organization.
- `USER`: only to their own; a manipulated cookie is ignored.

## Database

lerd PostgreSQL, `playground` database, at `127.0.0.1:5432`.

```bash
pnpm --filter playground prisma:generate
pnpm --filter playground db:push     # sync the schema
pnpm --filter playground db:seed     # RESETS users and posts, creates Better Auth accounts
pnpm --filter playground db:smoke    # read raw Prisma types
```

`prisma.config.ts` is the only source of the URL for the CLI. Prisma 7 does not
accept `url` in the schema and does not load `.env` on its own, which is why the
config imports `dotenv/config`.

If the panel returns `P1001`, the PostgreSQL service is stopped:
`lerd service start postgres`.

## Commands

```bash
pnpm --filter playground dev       # http://localhost:3100
pnpm --filter playground build
pnpm --filter playground typecheck # requires prisma:generate first
```

## Requirements

Node.js >= 22.
