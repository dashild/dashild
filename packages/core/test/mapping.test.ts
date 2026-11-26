/**
 * Verificación ejecutable de la tabla de mapeo.
 *
 * No es un test de integración: es la especificación de Architecture §10
 * convertida en aserciones. Si un tipo cambia de comportamiento, este archivo
 * es el que manda.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EMPTY_MAPPING_CONTEXT,
  buildObjectSchema,
  mappingContext,
  resolveFieldMapping,
  type DashildMetadata,
  type FieldMetadata,
} from "../src/index.js";

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

const metadata: DashildMetadata = {
  formatVersion: 1,
  schemaPath: "/tmp/schema.prisma",
  models: [],
  enums: [{ name: "Role", values: ["ADMIN", "USER"] }],
};

const context = mappingContext(metadata);

test("String: text/text, zod rechaza números", () => {
  const mapping = resolveFieldMapping(field({}), context);
  assert.equal(mapping.field, "text");
  assert.equal(mapping.format, "text");
  assert.equal(mapping.column, true);
  assert.equal(mapping.editable, true);
  assert.equal(mapping.zod.safeParse("hola").success, true);
  assert.equal(mapping.zod.safeParse(42).success, false);
});

test("String @db.Text: textarea", () => {
  const mapping = resolveFieldMapping(field({ nativeType: "Text" }), context);
  assert.equal(mapping.field, "textarea");
  assert.equal(mapping.format, "text");
});

test("String @db.Uuid: valida forma de UUID", () => {
  const mapping = resolveFieldMapping(field({ nativeType: "Uuid" }), context);
  assert.equal(mapping.field, "text");
  assert.equal(
    mapping.zod.safeParse("123e4567-e89b-12d3-a456-426614174000").success,
    true,
  );
  assert.equal(mapping.zod.safeParse("no-es-un-uuid").success, false);
});

test("Int: number, sin coerciones silenciosas", () => {
  const mapping = resolveFieldMapping(field({ type: "Int" }), context);
  assert.equal(mapping.field, "number");
  assert.equal(mapping.format, "number");
  assert.equal(mapping.zod.safeParse(12).success, true);
  assert.equal(mapping.zod.safeParse(12.5).success, false);
  // Rechazar el string obliga al formulario a convertir; coercionar "" a 0
  // sería peor que el error.
  assert.equal(mapping.zod.safeParse("12").success, false);
});

test("Float: number finito", () => {
  const mapping = resolveFieldMapping(field({ type: "Float" }), context);
  assert.equal(mapping.zod.safeParse(1.5).success, true);
  assert.equal(mapping.zod.safeParse(Number.POSITIVE_INFINITY).success, false);
});

test("Decimal: string en ambos sentidos y formato number, no currency", () => {
  const mapping = resolveFieldMapping(field({ type: "Decimal" }), context);
  assert.equal(mapping.field, "number");
  assert.equal(mapping.format, "number");
  assert.equal(mapping.zod.safeParse("19.99").success, true);
  assert.equal(mapping.zod.safeParse("-0.5").success, true);
  assert.equal(mapping.zod.safeParse("19,99").success, false);
  assert.equal(mapping.zod.safeParse(19.99).success, false);

  const decimalLike = {
    toFixed: () => "19.99",
    toJSON: () => "19.99",
    toString: () => "19.99",
  };
  assert.equal(mapping.dto(decimalLike), "19.99");
  assert.equal(mapping.toDb("19.99"), "19.99");
});

test("BigInt: string en el cliente, bigint en la escritura", () => {
  const mapping = resolveFieldMapping(field({ type: "BigInt" }), context);
  assert.equal(mapping.format, "text");
  assert.equal(mapping.dto(9007199254740993n), "9007199254740993");
  assert.equal(mapping.toDb("9007199254740993"), 9007199254740993n);
  assert.equal(mapping.zod.safeParse("9007199254740993").success, true);
  assert.equal(mapping.zod.safeParse("12.5").success, false);
});

test("DateTime: ISO 8601 en el DTO, Date en zod y en la escritura", () => {
  const mapping = resolveFieldMapping(field({ type: "DateTime" }), context);
  assert.equal(mapping.field, "datetime");
  assert.equal(mapping.format, "datetime");

  const date = new Date("2026-11-24T10:00:00.000Z");
  assert.equal(mapping.dto(date), "2026-11-24T10:00:00.000Z");
  assert.ok(mapping.toDb("2026-11-24T10:00:00.000Z") instanceof Date);

  const parsed = mapping.zod.safeParse("2026-11-24T10:00:00.000Z");
  assert.equal(parsed.success, true);
  assert.ok(parsed.data instanceof Date);
  assert.equal(mapping.zod.safeParse("ayer").success, false);
});

test("DateTime @db.Date: campo de fecha sin hora", () => {
  const mapping = resolveFieldMapping(
    field({ type: "DateTime", nativeType: "Date" }),
    context,
  );
  assert.equal(mapping.field, "date");
  assert.equal(mapping.format, "date");
});

test("Json: objeto plano y validate de JSON", () => {
  const mapping = resolveFieldMapping(field({ type: "Json" }), context);
  assert.equal(mapping.field, "json");
  assert.equal(mapping.format, "json");
  assert.deepEqual(mapping.dto({ a: 1 }), { a: 1 });
  assert.equal(mapping.zod.safeParse({ a: 1 }).success, true);
});

test("Boolean: badge", () => {
  const mapping = resolveFieldMapping(field({ type: "Boolean" }), context);
  assert.equal(mapping.field, "boolean");
  assert.equal(mapping.format, "badge");
  assert.equal(mapping.zod.safeParse(true).success, true);
});

test("Enum: select/badge con los valores del schema", () => {
  const mapping = resolveFieldMapping(
    field({ type: "Role", kind: "enum" }),
    context,
  );
  assert.equal(mapping.field, "select");
  assert.equal(mapping.format, "badge");
  assert.equal(mapping.zod.safeParse("ADMIN").success, true);
  assert.equal(mapping.zod.safeParse("OWNER").success, false);
});

test("Enum sin valores en metadatos: texto con aviso, nunca lanza", () => {
  const mapping = resolveFieldMapping(
    field({ type: "Ghost", kind: "enum" }),
    EMPTY_MAPPING_CONTEXT,
  );
  assert.equal(mapping.field, "select");
  assert.match(mapping.warning ?? "", /Ghost/);
});

test("Relación m2o: id string o número, normalizado a string", () => {
  const mapping = resolveFieldMapping(
    field({
      name: "organization",
      type: "Organization",
      kind: "object",
      isRequired: true,
      relationName: "OrganizationToUser",
      relationFromFields: ["organizationId"],
    }),
    context,
  );
  assert.equal(mapping.field, "relation");
  assert.equal(mapping.editable, true);
  assert.equal(mapping.zod.parse("abc"), "abc");
  assert.equal(mapping.zod.parse(7), "7");
});

test("Relación o2m/m2m: lista de ids editable", () => {
  const mapping = resolveFieldMapping(
    field({ name: "posts", type: "Post", kind: "object", isList: true }),
    context,
  );
  assert.equal(mapping.column, false);
  assert.equal(mapping.editable, true);
  assert.equal(mapping.field, "relation");
  assert.deepEqual(
    mapping.zod.parse(["post-1", "post-2"]),
    ["post-1", "post-2"],
  );
});

test("@id no se edita pero se muestra", () => {
  const mapping = resolveFieldMapping(field({ isId: true }), context);
  assert.equal(mapping.column, true);
  assert.equal(mapping.editable, false);
});

test("@updatedAt nunca está en el formulario", () => {
  const mapping = resolveFieldMapping(
    field({ type: "DateTime", isUpdatedAt: true }),
    context,
  );
  assert.equal(mapping.editable, false);
});

test("Scalar list: JSON array in the form and table", () => {
  const mapping = resolveFieldMapping(
    field({ name: "tags", isList: true }),
    context,
  );
  assert.equal(mapping.field, "list");
  assert.equal(mapping.format, "json");
  assert.equal(mapping.column, true);
  assert.equal(mapping.editable, true);
  assert.deepEqual(mapping.dto(["a", "b"]), ["a", "b"]);
  assert.deepEqual(mapping.toDb(["a", "b"]), ["a", "b"]);
});

test("Bytes: base64, editable y convertido a Uint8Array", () => {
  const mapping = resolveFieldMapping(field({ type: "Bytes" }), context);
  assert.equal(mapping.column, false);
  assert.equal(mapping.editable, true);
  assert.equal(mapping.field, "bytes");
  assert.equal(mapping.dto(new Uint8Array([1, 2, 3])), "AQID");
  assert.deepEqual(
    Array.from(mapping.toDb("AQID") as Uint8Array),
    [1, 2, 3],
  );
});

test("Tipo desconocido: texto editable con aviso (generación total)", () => {
  const mapping = resolveFieldMapping(
    field({ type: "Unsupported", name: "geometry" }),
    context,
  );
  assert.equal(mapping.field, "text");
  assert.equal(mapping.editable, true);
  assert.match(mapping.warning ?? "", /geometry/);
});

test("create: opcional y con @default es opcional; update: todo opcional", () => {
  const fields: FieldMetadata[] = [
    field({ name: "name", isRequired: true }),
    field({ name: "nickname", isRequired: false }),
    field({ name: "status", isRequired: true, hasDefaultValue: true }),
    field({ name: "id", isId: true }),
  ];

  const create = buildObjectSchema(fields, context, "create");
  assert.equal(create.safeParse({ name: "Ana", nickname: null }).success, true);
  assert.equal(create.safeParse({ name: "Ana" }).success, true);
  assert.equal(create.safeParse({ name: 42 }).success, false);

  // `name` es obligatorio: su ausencia es el error, no la de `nickname`.
  const missingName = create.safeParse({ nickname: null });
  assert.equal(missingName.success, false);
  assert.equal(missingName.error?.issues[0]?.path[0], "name");

  // `id` no está en el esquema: el cliente no puede escribirlo.
  assert.equal("id" in create.shape, false);

  const update = buildObjectSchema(fields, context, "update");
  assert.equal(update.safeParse({}).success, true);
  assert.equal(update.safeParse({ name: "Ana" }).success, true);
});
