# Policies

Policies are server-only. They decide which rows a request can see and which
operations it can run. The resource only declares that it is protected.

```ts
import { definePolicies, hasRole, type CurrentUser } from "@dashild/core";

export const policies = definePolicies<CurrentUser>({
  resources: {
    Customer: {
      scope: (ctx) => ({ organizationId: ctx.organizationId }),
      can: {
        create: (ctx) => hasRole(ctx, "ADMIN", "SALES"),
        update: (ctx) => hasRole(ctx, "ADMIN", "SALES"),
        delete: (ctx) => hasRole(ctx, "ADMIN"),
      },
    },
  },
});
```

`definePolicies` requires the `resources` container.

## Fail closed

- No `policy` on the resource → denied.
- No entry in `policies.resources` → denied.
- `scope` returns `null` → the whole resource is denied.

`scope` must return a `where` object or `null`. Returning `undefined` (a
forgotten `return`) is not a denial.

## What the scope covers

Applied to top-level reads (`findMany`, `findFirst`, `findUnique`, `count`,
`aggregate`, `groupBy`), updates, deletes, and relation managers.

It does **not** cover:

- `create` / `createMany`: set the tenant/author explicitly on the server.
- Rows loaded through `include`: they are part of the same query and are not
  filtered by the related model's policy.

## Defaults

- `list`, `view`, `update`, `delete`: allowed when there is no predicate.
- `create`: denied when the scope is not empty and there is no `can.create`.
- A declared action with `requires`: denied unless a predicate with that name
  exists.

These are permission defaults, not authentication. Keep resolving the session
and validating input.

## Context

`ctx.user`, `ctx.organizationId`, `ctx.roles`.

`organizationId` and `roles` come from `organizationOf`/`rolesOf` when defined;
otherwise from `user.organizationId` / `user.roles`. They **replace**, not
fall back.

`hasRole(ctx, "ADMIN", "SALES")` returns true when any role matches.

## Common scopes

**Tenant (organization):**

```ts
scope: (ctx) =>
  ctx.organizationId ? { organizationId: ctx.organizationId } : null,
```

**Author ownership, admins see all:**

```ts
scope: (ctx) =>
  hasRole(ctx, "ADMIN") ? {} : { authorId: ctx.user.id },
```

**Public/authenticated, no row filter:**

```ts
scope: () => ({}),
```

**Related model ownership** (for example, comments on an author's posts):

```ts
scope: (ctx) =>
  hasRole(ctx, "ADMIN")
    ? {}
    : { post: { authorId: ctx.user.id } },
```

## Creating rows

The runtime does not copy a tenant or author into inserts. The generic form can
send any value in an editable field. If a row must belong to the active tenant or
author:

- Keep create disabled until you implement a server-side flow that sets the
  field from the authenticated context.
- Or add a server action that overrides the field; never trust a hidden input or
  a browser value.

This is a deliberate security boundary, not a bug.

## Tenancy

`dashild init --tenancy` (or the `saas` starter) adds:

- `Organization` and `User.organizationId`/`role`.
- An organization-aware `getCurrentUser`.
- `switchOrganization` and the sidebar switcher.
- A cookie validated on every request.

Scope every tenant model with `{ organizationId: ctx.organizationId }`. Return
`null` when there is no organization so an unresolved session sees nothing.

## Rules

- `policies.ts` is server-only by convention; never import it from a client
  component.
- The client cannot influence the policy; server actions resolve it.
- Role names are app-defined strings.
- A missing predicate on `update`/`delete` allows the operation (within the
  scope). Add predicates when the role matters.
