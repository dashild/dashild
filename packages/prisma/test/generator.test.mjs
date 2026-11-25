/**
 * Test de integración del generador.
 *
 * No simula el DMMF: ejecuta `prisma generate` de verdad sobre el schema hostil
 * y verifica el artefacto. Es la única forma de comprobar tres cosas que un mock
 * esconde: que el `provider` se resuelve como comando, que Prisma 7 entrega
 * `nativeType` y `relationFromFields` como esperamos, y que el JSON es estable.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const repoRoot = resolve(packageRoot, "../..");
const schemaPath = join(here, "fixtures/hostile/schema.prisma");
const generatedDir = join(here, "fixtures/generated");
const metadataPath = join(generatedDir, "dashild/dashild-metadata.json");

/**
 * El generador se resuelve por `PATH` (Prisma ejecuta `provider` con /bin/sh).
 * En una app real, npm/pnpm ponen `node_modules/.bin` al correr scripts; aquí se
 * replica usando el `.bin` de la raíz del monorepo.
 */
function generate() {
  rmSync(generatedDir, { recursive: true, force: true });

  execFileSync("pnpm", ["exec", "prisma", "generate", "--schema", schemaPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: `${join(repoRoot, "node_modules/.bin")}:${process.env.PATH ?? ""}`,
    },
    stdio: "pipe",
  });

  return JSON.parse(readFileSync(metadataPath, "utf8"));
}

let cached;

/** Una sola generación por proceso: el resto de tests leen el mismo artefacto. */
function generateOnce() {
  cached ??= generate();
  return cached;
}

const model = (metadata, name) => {
  const found = metadata.models.find((entry) => entry.name === name);
  assert.ok(found, `falta el modelo ${name}`);
  return found;
};

const field = (modelMetadata, name) => {
  const found = modelMetadata.fields.find((entry) => entry.name === name);
  assert.ok(found, `falta el campo ${name} en ${modelMetadata.name}`);
  return found;
};

test("genera el artefacto con formato y procedencia", () => {
  const metadata = generateOnce();

  assert.equal(metadata.formatVersion, 1);
  assert.ok(metadata.schemaPath.endsWith("fixtures/hostile/schema.prisma"));
  assert.equal(typeof metadata.engineVersion, "string");
  // Sin generador `prisma-client` en el schema, no hay ruta de cliente.
  assert.equal(metadata.clientOutput, undefined);
  assert.deepEqual(
    metadata.models.map((entry) => entry.name).sort(),
    ["Organization", "Post", "User"],
  );
  assert.deepEqual(metadata.enums, [
    { name: "Role", values: ["ADMIN", "USER"] },
  ]);
});

test("tipos hostiles: enum, Decimal, BigInt, Json, Bytes y @db.Text", () => {
  const user = model(generateOnce(), "User");

  assert.equal(field(user, "role").kind, "enum");
  assert.equal(field(user, "role").type, "Role");

  assert.equal(field(user, "balance").type, "Decimal");
  assert.equal(field(user, "balance").nativeType, "Decimal");
  assert.equal(field(user, "balance").isRequired, true);

  assert.equal(field(user, "bigNumber").type, "BigInt");
  assert.equal(field(user, "metadata").type, "Json");
  assert.equal(field(user, "metadata").isRequired, false);

  assert.equal(field(user, "avatar").type, "Bytes");
  assert.equal(field(user, "bio").nativeType, "Text");
  assert.equal(field(user, "bio").isRequired, false);
});

test("claves y marcas de solo lectura", () => {
  const metadata = generateOnce();
  const user = model(metadata, "User");
  const post = model(metadata, "Post");

  // id uuid
  assert.equal(field(user, "id").isId, true);
  assert.equal(field(user, "id").isReadOnly, true);
  assert.equal(field(user, "id").nativeType, "Uuid");

  // id autoincrement (Int)
  assert.equal(field(post, "id").isId, true);
  assert.equal(field(post, "id").type, "Int");

  assert.equal(field(user, "updatedAt").isUpdatedAt, true);
  assert.equal(field(user, "updatedAt").isReadOnly, true);

  // Las FK las escribe la relación: nunca son editables por separado.
  assert.equal(field(user, "organizationId").isReadOnly, true);
  assert.equal(field(post, "authorId").isReadOnly, true);
  assert.equal(field(post, "parentId").isReadOnly, true);
});

test("relaciones m2o, o2m y auto-relación", () => {
  const metadata = generate();
  const user = model(metadata, "User");
  const post = model(metadata, "Post");

  const organization = field(user, "organization");
  assert.equal(organization.kind, "object");
  assert.equal(organization.relationName, "OrganizationToUser");
  assert.deepEqual(organization.relationFromFields, ["organizationId"]);
  assert.equal(organization.isList, false);

  assert.equal(field(user, "posts").isList, true);

  // La auto-relación conserva el nombre explícito en ambos lados.
  assert.equal(field(post, "parent").relationName, "PostHierarchy");
  assert.equal(field(post, "children").relationName, "PostHierarchy");
  assert.equal(field(post, "children").isList, true);
});

test("lista escalar y defaults", () => {
  const metadata = generateOnce();
  const post = model(metadata, "Post");
  const user = model(metadata, "User");

  assert.equal(field(post, "tags").isList, true);
  assert.equal(field(post, "tags").kind, "scalar");

  assert.equal(field(post, "published").hasDefaultValue, true);
  assert.equal(field(user, "role").hasDefaultValue, true);
  assert.equal(field(user, "createdAt").hasDefaultValue, true);
});

test("generar dos veces produce el mismo artefacto", () => {
  const first = generate();
  const second = generate();
  assert.deepEqual(second, first);
});

test("resolveClientOutput resuelve la ruta del cliente sin asumir node_modules", async () => {
  const { resolveClientOutput } = await import("../dist/extract.js");

  const generator = (provider, output) => ({
    provider: { value: provider, fromEnvVar: null },
    output: output ? { value: output, fromEnvVar: null } : null,
  });

  const schemaPath = "/app/prisma/schema.prisma";

  assert.deepEqual(
    resolveClientOutput(schemaPath, [
      generator("prisma-client", "../src/generated/prisma"),
    ]),
    { clientOutput: "/app/src/generated/prisma" },
  );

  assert.deepEqual(
    resolveClientOutput(schemaPath, [
      generator("prisma-client", "/abs/client"),
    ]),
    { clientOutput: "/abs/client" },
  );

  assert.deepEqual(
    resolveClientOutput(schemaPath, [generator("prisma-client-js", null)]),
    {},
  );

  // `provider` por variable de entorno: no hay valor que inspeccionar.
  assert.deepEqual(
    resolveClientOutput(schemaPath, [
      { provider: { value: null, fromEnvVar: "GEN" }, output: null },
    ]),
    {},
  );
});
