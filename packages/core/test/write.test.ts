/**
 * Especificación de la escritura.
 *
 * Sin Prisma: se prueba la validación autoritativa, la whitelist del formulario
 * y la conversión a datos de Prisma (`toDb`, relaciones, defaults).
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  mappingContext,
  type DashildMetadata,
  type FieldMetadata,
  type ModelMetadata,
  type ResourceDefinition,
} from "../src/index.js";
import {
  formatPrismaError,
  parseWriteInput as parseWrite,
} from "../src/server.js";

const field = (overrides: Partial<FieldMetadata>): FieldMetadata => ({
  name: "sample",
  type: "String",
  kind: "scalar",
  isRequired: true,
  isList: false,
  isId: false,
  isUnique: false,
  isReadOnly: false,
  hasDefaultValue: false,
  ...overrides,
});

const model: ModelMetadata = {
  name: "User",
  fields: [
    field({ name: "id", nativeType: "Uuid", isId: true, isReadOnly: true }),
    field({ name: "name" }),
    field({ name: "email" }),
    field({ name: "role", type: "Role", kind: "enum", hasDefaultValue: true }),
    field({ name: "balance", type: "Decimal", hasDefaultValue: true }),
    field({ name: "bigNumber", type: "BigInt", hasDefaultValue: true }),
    field({ name: "metadata", type: "Json", isRequired: false }),
    field({ name: "bio", nativeType: "Text", isRequired: false }),
    field({ name: "isActive", type: "Boolean", hasDefaultValue: true }),
    field({ name: "organizationId", isReadOnly: true }),
    field({
      name: "organization",
      type: "Organization",
      kind: "object",
      isRequired: true,
      relationName: "OrganizationToUser",
      relationFromFields: ["organizationId"],
    }),
    field({ name: "createdAt", type: "DateTime", hasDefaultValue: true }),
  ],
};

const metadata: DashildMetadata = {
  formatVersion: 1,
  schemaPath: "/tmp/schema.prisma",
  models: [model],
  enums: [{ name: "Role", values: ["ADMIN", "USER"] }],
};

const resource: ResourceDefinition = {
  model: "User",
  navigation: { label: "Users", slug: "users" },
  table: { columns: [] },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true, min: 2 } },
      { field: "email", type: "email", rules: { required: true } },
      { field: "role", type: "select" },
      { field: "balance", type: "number" },
      { field: "bigNumber", type: "number" },
      { field: "metadata", type: "json" },
      { field: "bio", type: "textarea" },
      { field: "isActive", type: "boolean" },
      {
        field: "organization",
        type: "relation",
        relation: "organization",
        display: "name",
        rules: { required: true },
      },
    ],
  },
};

const context = mappingContext(metadata, "es");

test("create: valida, convierte y conecta la relación", () => {
  const result = parseWrite(resource, model, context, {
    name: "Ana",
    email: "ana@test.com",
    role: "ADMIN",
    balance: "10.50",
    bigNumber: "900",
    metadata: '{"theme":"dark"}',
    bio: "",
    isActive: true,
    organization: "org-1",
  }, "create");

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.data, {
    name: "Ana",
    email: "ana@test.com",
    role: "ADMIN",
    balance: "10.50",
    bigNumber: 900n,
    metadata: { theme: "dark" },
    bio: null,
    isActive: true,
    organization: { connect: { id: "org-1" } },
  });

  assert.equal(typeof result.data.bigNumber, "bigint");
});

test("create: reglas del recurso y campos obligatorios", () => {
  const result = parseWrite(resource, model, context, {
    name: "A",
    email: "no-es-email",
    organization: "",
  }, "create");

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.match(result.fieldErrors.name?.[0] ?? "", /Mínimo 2/);
  assert.match(result.fieldErrors.email?.[0] ?? "", /email/);
  assert.match(result.fieldErrors.organization?.[0] ?? "", /Selecciona/);
});

test("whitelist: un campo fuera del formulario no se escribe", () => {
  const result = parseWrite(resource, model, context, {
    name: "Ana",
    email: "ana@test.com",
    organization: "org-1",
    id: "inyectado",
    organizationId: "otra-org",
    createdAt: "2020-01-01",
  }, "create");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal("id" in result.data, false);
  assert.equal("organizationId" in result.data, false);
  assert.equal("createdAt" in result.data, false);
});

test("update: parcial, vacío desconecta la relación", () => {
  const partial = parseWrite(resource, model, context, { name: "Ana" }, "update");
  assert.equal(partial.ok, true);
  if (partial.ok) assert.deepEqual(partial.data, { name: "Ana" });

  const disconnect = parseWrite(
    resource,
    model,
    context,
    { organization: "" },
    "update",
  );
  assert.equal(disconnect.ok, true);
  if (disconnect.ok) {
    assert.deepEqual(disconnect.data, {
      organization: { disconnect: true },
    });
  }
});

test("create: requerido con default se omite (lo pone la base)", () => {
  const result = parseWrite(resource, model, context, {
    name: "Ana",
    email: "ana@test.com",
    organization: "org-1",
    isActive: "",
  }, "create");

  assert.equal(result.ok, true);
  if (result.ok) assert.equal("isActive" in result.data, false);
});

test("errores de Prisma: P2002 por campo, P2025 y P2003", () => {
  assert.deepEqual(
    formatPrismaError({ code: "P2002", meta: { target: ["email"] } }, "es"),
    { fieldErrors: { email: ["Este valor ya está en uso."] } },
  );

  assert.deepEqual(formatPrismaError({ code: "P2025" }, "es"), {
    fieldErrors: {},
    message: "El registro ya no existe.",
  });

  assert.match(
    formatPrismaError({ code: "P2003" }, "es").message ?? "",
    /relacionado/,
  );
});
