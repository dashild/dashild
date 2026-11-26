# @dashild/core

Public declarations and isomorphic logic. **It cannot import React or Prisma**:
both the server and `registry.tsx` on the client consume it. It does depend on
`zod`, which is isomorphic and provides the same schema on both sides.

## Public surface

```ts
// Declarations (serializable data)
export { defineResource, definePanel, definePolicies, hasRole };
export type { CurrentUser, PolicyContext, PoliciesDefinition };

// App registry (components, not data)
export { registerCell, registerField };

// Metadata contract (DMMF → JSON)
export type { FieldMetadata, ModelMetadata, EnumMetadata, DashildMetadata };
export { METADATA_FORMAT_VERSION };

// Type mapping table
export {
  SCALAR_MAPPINGS, // Prisma → zod / field / cell / dto / toDb
  resolveFieldMapping, // DMMF field → resolved mapping
  buildFieldSchema, // + requiredness for the operation
  buildObjectSchema, // full form row
  mappingContext,
};
```

## Custom cells and fields

`registerCell(name, component)` and `registerField(name, component)` store
renderers for the client. Resources reference them with data:

```ts
table: { columns: [{ field: "name", cell: "avatar" }] }
form: { fields: [{ field: "email", type: "email", component: "email" }] }
```

`registerCell`/`registerField` are called from a client module
(`src/dashild/registry.tsx`), and the renderer is served through
`RegistryProvider`. Core does not import React: the type is deliberately
generic.

## `metadata.ts` and `mapping.ts`

They are the same contract seen from two sides:

- `metadata.ts` defines what the generator extracts from the DMMF. Flat,
  serializable data.
- `mapping.ts` defines what Dashild does with each type. It is the executable
  specification of `Architecture.md` §10.

They live in core, not in `@dashild/prisma`, because the server runtime
(validation and DTO authority) and the CLI (scaffold) need them, not just the
generator. `@dashild/prisma` re-exports them.

`mapping.ts` exposes **`dto` and `toDb`**: the conversion in both directions.
Without the return path, the Zod schema promises something Prisma rejects (for
example, `BigInt` as a string).

## `./server`

A subpath with the server surface. Never import it from a client component:

- `createDashildRuntime({ prisma, metadata, resources, policies, actions })`:
  list, detail, options, writes, and actions.
- `withDashildScope({ resources, policies, user })`: a Prisma extension that
  applies the policy `where` to direct queries.
- `runtime.client(user)`: a Prisma client already extended for your own code.
- `runtime.relationManagers(...)` and `runtime.relationAction(...)`: o2m/m2m
  relation manager (list, associate, detach, attach, delete).
- `canPerform`, `resolvePolicy`, `withScope`, and DTO conversion.

Keeping it as a subpath (instead of a separate package) avoids multiplying
package names: the client never imports `@dashild/core/server`, so the browser
bundle does not pull in Prisma.

## Policies and roles

`PolicyContext` carries `user`, `organizationId`, and `roles`. The organization
and roles are resolved with `organizationOf`/`rolesOf` when defined; otherwise
`user.organizationId` and `user.roles` are used. That lets `getCurrentUser`
return the context directly:

```ts
export const policies = definePolicies<CurrentUser>({
  Customer: {
    scope: (ctx) => ({ organizationId: ctx.organizationId }),
    can: {
      create: (ctx) => hasRole(ctx, "ADMIN", "SALES"),
      delete: (ctx) => hasRole(ctx, "ADMIN"),
    },
  },
});
```

`hasRole(ctx, ...roles)` returns `true` when the context has at least one of
them. Without a `scope` or an entry in `policies.ts`, the runtime fails closed.

## Tests

```bash
pnpm --filter @dashild/core test
```

Compiles `src` + `test` into `dist-test/` and runs with `node --test`.
`test/mapping.test.ts` is the specification: 21 cases over the hostile schema
(Decimal, BigInt, Json, enums, relations, optionals, unknown types).
