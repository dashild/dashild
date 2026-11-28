# Actions

An action is a named server operation declared in the resource. The handler runs
on the server with the scoped Prisma client.

## Declare

```ts
table: {
  actions: [
    { name: "create", placement: "header" },
    { name: "view", placement: "row" },
    { name: "edit", placement: "row" },
    { name: "delete", placement: "row" },
    {
      name: "publish",
      label: "Publish",
      placement: "row",
      requires: "publish",
      variant: "secondary",
    },
    {
      name: "archive",
      label: "Archive",
      placement: "row",
      requires: "archive",
      confirm: true,
    },
  ],
}
```

Fields: `name`, `label`, `icon`, `variant`, `placement` (`header`/`row`),
`confirm`, `requires`, `href`, `data`.

**Built-in names** are `create`, `view`, `edit`, `delete`, `save`, `cancel`.
Never reuse them for custom actions: the panel treats them as built-ins and your
handler never runs.

Declaring `table.actions` **replaces** the built-ins. List the ones you keep.

## Implement

`src/dashild/actions/index.ts`:

```ts
import type { ActionHandler, CurrentUser } from "@dashild/core";

export const resourceActions: Record<
  string,
  Record<string, ActionHandler<CurrentUser>>
> = {
  Post: {
    publish: async ({ db, id }) => {
      if (!id) return { ok: false, message: "Missing post id." };
      const client = db as {
        post: {
          update(args: {
            where: { id: string };
            data: { status: string; publishedAt: Date | null };
          }): Promise<unknown>;
        };
      };

      await client.post.update({
        where: { id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });

      return { ok: true, message: "Post published." };
    },
  },
};
```

`db` is Prisma extended with the policy scope. A row outside the scope cannot be
updated, even with a guessed id. Do not import Prisma directly for tenant/author
data.

## Context

`resource`, `user`, `id` (row), `values` (form), `data` (declared on the
action), `organizationId`, `roles`, `db`.

## Results

`{ ok: true, message?, href? }` or `{ ok: false, message? }`. `href` navigates
after success. Errors are shown as a toast; successful actions refresh the
table.

## Requires and roles

`requires: "<name>"` is checked against `policies.ts`:

```ts
can: {
  publish: (ctx) => hasRole(ctx, "ADMIN", "EDITOR"),
}
```

If the predicate is missing, the action is hidden and the server denies it.

## Generate a stub

```bash
pnpm dashild make:action Post publish
```

Appends a typed stub keyed by model and action. It does not edit the resource;
declare the action yourself. Running it twice is safe.

## Rules

- Server-side validation is mandatory for business rules (stock, status
  transitions, ownership).
- Name custom actions with a domain verb (`publish`, `approve`, `assign`,
  `cancelAppointment`), not a built-in.
- Confirmation is UI only; the server must still enforce the rule.
- Long-running work belongs in a queue, not in the request.
