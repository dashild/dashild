# @dashild/admin

Runtime del panel: shell, tabla, formulario y primitivas shadcn. El subpath
`./server` monta la ruta y no entra en el bundle del navegador; el resto sí.

## Contenido

- `AdminPage` (`@dashild/admin/server`): resuelve sesión, recurso, políticas y datos, y monta el shell. La ruta de la app queda en pocas líneas.
- `AdminShell`: sidebar, cabecera, tema, toasts y contenedor del panel.
- `ResourceTable`, `ResourceDetail`, `ResourceForm` y sus acciones.
- `DashboardHome`, `NavMain`, `NavUser`, `SiteHeader`, `OrganizationSwitcher`.
- `IconProvider`/`useIcons`: registro de iconos de la app.
- `RegistryProvider`/`useRegistry`: celdas y campos propios. `ColumnDefinition.cell`
  elige una celda; `FieldDefinition.component` elige un campo.
- `buildFormSchema`: Zod de cliente, la misma validación que aplica el servidor.
- `ui/*`: primitivas shadcn autocontenidas (`@dashild/admin/ui/button`, etc.).
- Tipos de acciones (`SaveAction`, `DeleteAction`, `RunAction`) para que la app
  pase sus server actions sin acoplar el paquete.

## Reglas

- `"use client"` en los módulos que lo necesiten. El build conserva el directive.
- Nunca importa `@/dashild/policies`, `panel.ts`, el cliente de Prisma ni las
  acciones de la app. La página pasa datos serializables y server actions.
- Los iconos, celdas y campos son componentes React: no se pueden serializar.
  El shell los lee de `IconProvider` y `RegistryProvider`, que la app monta en
  módulos cliente (`src/dashild/icons.tsx`, `src/dashild/registry.tsx`).
- React, React DOM y Next son `peerDependencies`.
- El CSS del shell se escanea desde la app con `@source`; no hay CSS propio.

## Uso

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

`AdminPage` recibe el runtime de datos (`@dashild/core/server`) y las server
actions de la app. `ResourceTable` y `ResourceForm` también se pueden usar por
separado si una app necesita una pantalla propia.
