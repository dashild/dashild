# @dashild/core

Declaraciones públicas y lógica isomorfa. **No puede importar React ni Prisma**: lo consume tanto el servidor como `registry.tsx` en el cliente. Sí depende de `zod`, que es isomorfo y es el mismo esquema en ambos lados.

## Superficie pública

```ts
// Declaraciones (datos serializables)
export { defineResource, definePanel, definePolicies, hasRole }
export type { CurrentUser, PolicyContext, PoliciesDefinition }

// Registro de la app (componentes, no datos)
export { registerCell, registerField }

// Contrato de metadatos (DMMF → JSON)
export type { FieldMetadata, ModelMetadata, EnumMetadata, DashildMetadata }
export { METADATA_FORMAT_VERSION }

// Tabla de mapeo de tipos
export {
  SCALAR_MAPPINGS,          // Prisma → zod / campo / celda / dto / toDb
  resolveFieldMapping,      // campo del DMMF → mapeo resuelto
  buildFieldSchema,         // + obligatoriedad según la operación
  buildObjectSchema,        // fila completa de formulario
  mappingContext,
}
```

## Celdas y campos propios

`registerCell(name, component)` y `registerField(name, component)` guardan
renderers para el cliente. El recurso los referencia con datos:

```ts
table: { columns: [{ field: "name", cell: "avatar" }] }
form: { fields: [{ field: "email", type: "email", component: "email" }] }
```

`registerCell`/`registerField` se llaman desde un módulo cliente
(`src/dashild/registry.tsx`) y el renderer se sirve con `RegistryProvider`.
Core no importa React: el tipo es deliberadamente genérico.

## `metadata.ts` y `mapping.ts`

Son el mismo contrato visto desde dos lados:

- `metadata.ts` define lo que el generador extrae del DMMF. Datos planos, serializables.
- `mapping.ts` define qué hace Dashild con cada tipo. Es la especificación ejecutable de `Architecture.md` §10.

Viven en core y no en `@dashild/prisma` porque los necesita el runtime del servidor (autoridad de validación y DTO) y el CLI (scaffold), no solo el generador. `@dashild/prisma` los re-exporta.

`mapping.ts` expone **`dto` y `toDb`**: la conversión de ida y de vuelta. Sin la vuelta, el esquema Zod promete algo que Prisma rechaza (`BigInt` como string).

## `./server`

Subpath con la superficie de servidor. Nunca se importa desde un componente cliente:

- `createDashildRuntime({ prisma, metadata, resources, policies, actions })`:
  listado, detalle, opciones, escritura y acciones.
- `withDashildScope({ resources, policies, user })`: extensión de Prisma que
  aplica el `where` de la política a consultas directas.
- `runtime.client(user)`: cliente Prisma ya extendido para código propio.
- `runtime.relationManagers(...)` y `runtime.relationAction(...)`: relation manager
  o2m/m2m (listar, asociar, desasociar, attach, detach, delete).
- `canPerform`, `resolvePolicy`, `withScope` y la conversión a DTO.

Mantenerlo como subpath (y no como paquete aparte) evita multiplicar nombres de paquete: el bundle no arrastra Prisma porque el cliente no importa `@dashild/core/server`.

## Políticas y roles

`PolicyContext` lleva `user`, `organizationId` y `roles`. La organización y los
roles se resuelven con `organizationOf`/`rolesOf` si están definidos; si no, se
usan `user.organizationId` y `user.roles`. Eso permite que `getCurrentUser`
devuelva el contexto directamente:

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

`hasRole(ctx, ...roles)` devuelve `true` si el contexto tiene al menos uno. Si no
hay `scope` ni entrada en `policies.ts`, el runtime falla cerrado.

## Tests

```bash
pnpm --filter @dashild/core test
```

Compila `src` + `test` a `dist-test/` y ejecuta con `node --test`. `test/mapping.test.ts` es la especificación: 21 casos sobre el schema hostil (Decimal, BigInt, Json, enums, relaciones, opcionales, tipos desconocidos).
