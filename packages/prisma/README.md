# @dashild/prisma

Generador oficial de Prisma. Se declara en `schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

generator dashild {
  provider = "dashild-prisma-generator"
  output   = "../src/generated/dashild"
}
```

Escribe **un solo archivo**: `dashild-metadata.json`. No genera recursos, ni páginas, ni clientes.

## Qué contiene el artefacto

| Campo | Para qué |
| --- | --- |
| `formatVersion` | Dashild rechaza metadatos de un formato que no entiende |
| `schemaPath` | Ruta absoluta del schema de origen |
| `clientOutput` | Ruta absoluta del cliente Prisma, si hay un generador `prisma-client` |
| `engineVersion` | Hash del engine con el que Prisma generó (diagnóstico) |
| `models` | Campos, tipos, enums, relaciones, `nativeType`, marcas de solo lectura |
| `enums` | Nombre y valores |

`engineVersion` no es la versión de Prisma: `options.version` de Prisma 7 es el commit del engine. La versión del paquete no se expone al generador.

## Resolución del provider (verificado con Prisma 7.10.1)

**Prisma no resuelve `provider` como módulo de Node.** Ejecuta la cadena tal cual con `/bin/sh`. Por eso `provider = "dashild-prisma-generator"` funciona únicamente porque el paquete publica un `bin` con ese nombre y npm/pnpm ponen `node_modules/.bin` en el `PATH` al correr scripts.

Consecuencia: `pnpm prisma generate` (o `npm run ...`) funciona; invocar el binario de Prisma desde un entorno sin ese `PATH` falla con `dashild-prisma-generator: orden no encontrada`. El error es explícito, no silencioso.

## Prisma 7

- La `url` del datasource ya no se declara en el schema: va en `prisma.config.ts` o en el constructor del cliente. El fixture no la declara porque `generate` no se conecta.
- `@prisma/generator-helper` es CommonJS: el entrypoint lo carga con `createRequire`, no con un import nombrado de ESM.

## Código

- `src/generator.ts` — entrypoint. Solo registra el handler y escribe el archivo.
- `src/extract.ts` — DMMF → `DashildMetadata`. Funciones puras, probadas aparte.

## Tests

```bash
pnpm --filter @dashild/prisma test
```

Dos niveles:

- **Integración**: ejecuta `prisma generate` de verdad sobre `test/fixtures/hostile/schema.prisma` (enum, opcionales, `Decimal`, `BigInt`, `Json`, `Bytes`, `@db.Text`, `@db.Uuid`, m2o, o2m y auto-relación) y verifica el JSON.
- **Unidad**: `resolveClientOutput` con generadores sintéticos, incluido el caso de `provider` por variable de entorno.

El test necesita el `bin` del generador en el `PATH`; lo resuelve desde el `.bin` de la raíz del monorepo, que es donde pnpm enlaza `@dashild/prisma` (declarado como devDependency de la raíz precisamente para esto).
