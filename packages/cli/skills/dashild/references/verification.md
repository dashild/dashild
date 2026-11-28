# Verification

Run these after every change. Do not report "done" until `doctor` and `build`
pass.

```bash
pnpm prisma generate        # mandatory after a schema change (migrate dev does NOT run it)
pnpm dashild doctor         # resources, policies, handlers, slugs
pnpm build                  # typecheck + production build
```

If the project has a smoke script or tests, run them too.

## Common errors

**`No policy entry for model "X"`**
Add `X` under `resources` in `policies.ts`. `make:resource` adds a fail-closed
entry; replace it with the real scope and permissions.

**`Action "x" has no handler for Model`**
Add `Model.x` to `resourceActions` in `src/dashild/actions/index.ts`. If you just
ran `make:action`, check that the resource declares the action in
`table.actions`/`form.actions`.

**List is empty / resource returns 404**
The policy is fail-closed. Check:
- the resource has `policy: { scope: ... }`;
- `policies.resources` has the model;
- `scope` returns `{}`/a `where`, not `null`/`undefined`;
- a tenant app has an active organization (sidebar switcher).

**Relation dropdown is empty**
- In a tenant app, the related model needs `organizationId` and the user needs an
  active organization.
- The field needs `type: "relation"`, `relation`, and `display`.
- The related model must exist in the Prisma metadata (`prisma generate`).

**A custom action does not appear**
- The name collides with a built-in (`create`, `view`, `edit`, `delete`,
  `save`, `cancel`). Rename it.
- It has `requires` but no predicate with that name in `policies.ts`.
- The resource declares actions, replacing the built-ins, and omitted it.

**Form enum is a text input / validation errors**
Use `type: "select"` in `form.fields`. `type: "enum"` is for filters.

**Type errors after a schema change**
Run `pnpm prisma generate` and restart the dev server.

**`make:resource` says the model does not exist after a migration**
The metadata is stale. `prisma migrate dev` does not regenerate it; run
`pnpm prisma generate`, then retry.

**`init` refuses tenancy**
Tenancy requires Better Auth and a schema without auth models. Start from a
fresh scaffold or add `Organization`, `User.organizationId`, `User.role`, the
session, and the switch action by hand.

**Tailwind classes from the shell are missing**
The app's global CSS needs `@source "../../node_modules/@dashild/admin/dist";`
(adjust the path).

**Login fails with an origin error**
`BETTER_AUTH_URL` must match the browser origin, including the port.

**Table does not update after an action**
Older alpha versions did not refresh; upgrade (`pnpm dashild upgrade`) or reload.

## Final checklist

- [ ] Schema migrated and metadata regenerated.
- [ ] Every resource registered in `panel.ts`.
- [ ] Every model has a policy entry and a real scope.
- [ ] Custom actions have unique names, predicates, and handlers.
- [ ] Tenant/author ownership is set on the server for creates.
- [ ] Seed runs from an empty database.
- [ ] `dashild doctor` passes.
- [ ] `pnpm build` passes.
- [ ] Sign in with each role and verify what is visible.

## Version

Check `package.json` for the installed version. Docs and this skill may describe
a newer release than the one installed; when in doubt, run
`pnpm dashild upgrade --check` and read the changelog.
