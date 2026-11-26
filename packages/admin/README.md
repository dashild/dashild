# @dashild/admin

Panel runtime: shell, table, form, and shadcn primitives. The `./server` subpath
mounts the route and does not enter the browser bundle; everything else does.

## Contents

- `AdminPage` (`@dashild/admin/server`): resolves session, resource, policies,
  and data, then mounts the shell. The app route stays a few lines long.
- `AdminShell`: sidebar, header, theme, toasts, and panel container.
- `ResourceTable`/`DataTable` (TanStack), `ResourceDetail`, `ResourceForm`, and
  their actions.
- `RelationManager` for o2m/m2m in the detail page: create/edit/delete,
  associate/detach, and attach/detach.
- `BytesField` and `RelationMultiSelect` for `bytes` fields and m2m relations.
- `DashboardHome`, `NavMain`, `NavUser`, `SiteHeader`, `OrganizationSwitcher`.
- `IconProvider`/`useIcons`: the app's icon registry.
- `RegistryProvider`/`useRegistry`: custom cells and fields.
  `ColumnDefinition.cell` picks a cell; `FieldDefinition.component` picks a
  field.
- `buildFormSchema`: client Zod, the same validation the server applies.
- `ui/*`: self-contained shadcn primitives (`@dashild/admin/ui/button`, etc.).
- Action types (`SaveAction`, `DeleteAction`, `RunAction`) so the app can pass
  its server actions without coupling the package.

## Rules

- `"use client"` on the modules that need it. The build preserves the directive.
- It never imports `@/dashild/policies`, `panel.ts`, the Prisma client, or the
  app's actions. The page passes serializable data and server actions.
- Icons, cells, and fields are React components: they cannot be serialized. The
  shell reads them from `IconProvider` and `RegistryProvider`, which the app
  mounts in client modules (`src/dashild/icons.tsx`,
  `src/dashild/registry.tsx`).
- React, React DOM, and Next are `peerDependencies`.
- The shell CSS is scanned from the app with `@source`; there is no custom CSS.

## Usage

```tsx
// app/admin/[[...dashild]]/page.tsx (Server Component)
import { AdminPage } from "@dashild/admin/server";

return (
  <AdminPage
    panel={panel}
    policies={policies}
    runtime={runtime}
    saveAction={saveResource}
    deleteAction={deleteResource}
    runAction={runResourceAction}
    IconProvider={AppIconProvider}
    params={params}
    searchParams={searchParams}
    theme={theme}
  />
);
```

`AdminPage` receives the data runtime (`@dashild/core/server`) and the app's
server actions. `ResourceTable` and `ResourceForm` can also be used separately
when an app needs a custom screen.
