# @dashild/core

Declaraciones públicas y lógica isomorfa. **No puede importar React ni Prisma**: lo consume tanto el servidor como `registry.tsx` en el cliente. Sí depende de `zod`, que es isomorfo y es el mismo esquema en ambos lados.

## Superficie pública

```ts
// Declaraciones (datos serializables)
export { defineResource, definePanel, definePolicies, registerCell, registerField }

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

## `metadata.ts` y `mapping.ts`

Son el mismo contrato visto desde dos lados:

- `metadata.ts` define lo que el generador extrae del DMMF. Datos planos, serializables.
- `mapping.ts` define qué hace Dashild con cada tipo. Es la especificación ejecutable de `Architecture.md` §10.

Viven en core y no en `@dashild/prisma` porque los necesita el runtime del servidor (autoridad de validación y DTO) y el CLI (scaffold), no solo el generador. `@dashild/prisma` los re-exporta.

`mapping.ts` expone **`dto` y `toDb`**: la conversión de ida y de vuelta. Sin la vuelta, el esquema Zod promete algo que Prisma rechaza (`BigInt` como string).

## `./server`

Subpath con la superficie de servidor: `dashildAction`, extensión de Prisma y conversión a DTO. Nunca se importa desde un componente cliente.

Mantenerlo como subpath (y no como paquete aparte) evita multiplicar nombres de paquete: el bundle no arrastra Prisma porque el cliente no importa `@dashild/core/server`.

## Tests

```bash
pnpm --filter @dashild/core test
```

Compila `src` + `test` a `dist-test/` y ejecuta con `node --test`. `test/mapping.test.ts` es la especificación: 21 casos sobre el schema hostil (Decimal, BigInt, Json, enums, relaciones, opcionales, tipos desconocidos).
