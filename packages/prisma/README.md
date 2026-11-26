# @dashild/prisma

The official Prisma generator. Declare it in `schema.prisma`:

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

It writes **one file**: `dashild-metadata.json`. It does not generate resources,
pages, or clients.

## What the artifact contains

| Field | Purpose |
| --- | --- |
| `formatVersion` | Dashild rejects metadata in a format it does not understand |
| `schemaPath` | Absolute path to the source schema |
| `clientOutput` | Absolute path to the Prisma client, when a `prisma-client` generator exists |
| `engineVersion` | Hash of the engine Prisma used (diagnostic) |
| `models` | Fields, types, enums, relations, `nativeType`, read-only flags |
| `enums` | Name and values |

`engineVersion` is not the Prisma version: Prisma 7's `options.version` is the
engine commit. The package version is not exposed to the generator.

## Provider resolution (verified with Prisma 7.10.1)

**Prisma does not resolve `provider` as a Node module.** It runs the string
through `/bin/sh`. `provider = "dashild-prisma-generator"` works only because the
package publishes a `bin` with that name and npm/pnpm put `node_modules/.bin` on
`PATH` when running scripts.

Consequently, `pnpm prisma generate` (or `npm run ...`) works; invoking the
Prisma binary from an environment without that `PATH` fails with
`dashild-prisma-generator: command not found`. The error is explicit, not silent.

## Prisma 7

- The datasource `url` is no longer declared in the schema: it lives in
  `prisma.config.ts` or in the client constructor. The fixture does not declare
  it because `generate` does not connect.
- `@prisma/generator-helper` is CommonJS: the entrypoint loads it with
  `createRequire`, not a named ESM import.

## Code

- `src/generator.ts` — entrypoint. It only registers the handler and writes the
  file.
- `src/extract.ts` — DMMF → `DashildMetadata`. Pure functions, tested separately.

## Tests

```bash
pnpm --filter @dashild/prisma test
```

Two levels:

- **Integration**: runs a real `prisma generate` over
  `test/fixtures/hostile/schema.prisma` (enum, optionals, `Decimal`, `BigInt`,
  `Json`, `Bytes`, `@db.Text`, `@db.Uuid`, m2o, o2m, and self-relation) and
  verifies the JSON.
- **Unit**: `resolveClientOutput` with synthetic generators, including the
  `provider` from an environment variable.

The test needs the generator `bin` on `PATH`; it resolves it from the monorepo
root `.bin`, where pnpm links `@dashild/prisma` (declared as a root
devDependency for exactly this reason).
