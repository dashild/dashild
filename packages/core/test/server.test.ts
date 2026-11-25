/**
 * Especificación del runtime de lectura.
 *
 * Sin Prisma y sin base de datos: se prueba la parte que decide qué se puede
 * pedir y cómo se convierte la respuesta. Es donde vive la seguridad de la
 * whitelist y la corrección del DTO.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildListQuery,
  normalizeListParams,
  toDTO,
} from "../src/server.js";
import {
  mappingContext,
  type DashildMetadata,
  type FieldMetadata,
  type ModelMetadata,
  type ResourceDefinition,
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

const model: ModelMetadata = {
  name: "User",
  fields: [
    field({ name: "id", nativeType: "Uuid", isId: true, isReadOnly: true }),
    field({ name: "name" }),
    field({ name: "email" }),
    field({ name: "role", type: "Role", kind: "enum" }),
    field({ name: "balance", type: "Decimal" }),
    field({ name: "bigNumber", type: "BigInt" }),
    field({ name: "metadata", type: "Json", isRequired: false }),
    field({ name: "isActive", type: "Boolean" }),
    field({ name: "createdAt", type: "DateTime" }),
    field({ name: "organizationId" }),
    field({
      name: "organization",
      type: "Organization",
      kind: "object",
      relationName: "OrganizationToUser",
      relationFromFields: ["organizationId"],
    }),
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
  navigation: { label: "Usuarios", slug: "users" },
  table: {
    searchable: ["name", "email", "organization"],
    pageSize: 10,
    columns: [
      { field: "name", sortable: true },
      { field: "email", sortable: true },
      { field: "role", format: "badge" },
      { field: "organization", display: "name", sortable: true },
      { field: "balance" },
      { field: "createdAt", sortable: true },
    ],
    filters: [
      { field: "organization", type: "relation", display: "name" },
      { field: "isActive", type: "boolean" },
      { field: "ghost" as string, type: "text" },
    ],
  },
  form: { fields: [] },
};

test("parámetros: página y tamaño con límites", () => {
  assert.deepEqual(
    normalizeListParams(resource, {}),
    {
      page: 1,
      perPage: 10,
      sort: null,
      direction: "desc",
      search: null,
      filters: [],
    },
  );

  assert.equal(normalizeListParams(resource, { perPage: "500" }).perPage, 100);
  assert.equal(normalizeListParams(resource, { perPage: "0" }).perPage, 10);
  assert.equal(normalizeListParams(resource, { page: "3" }).page, 3);
  assert.equal(normalizeListParams(resource, { page: "-2" }).page, 1);
});

test("ordenación: solo columnas declaradas y sortable", () => {
  assert.equal(normalizeListParams(resource, { sort: "name" }).sort, "name");
  assert.equal(
    normalizeListParams(resource, { sort: "organization" }).sort,
    "organization",
  );

  // `role` es columna pero no sortable; `bigNumber` no es columna.
  assert.equal(normalizeListParams(resource, { sort: "role" }).sort, null);
  assert.equal(normalizeListParams(resource, { sort: "bigNumber" }).sort, null);
  assert.equal(normalizeListParams(resource, { sort: "email" }).sort, "email");
  assert.equal(
    normalizeListParams(resource, { sort: "name", dir: "asc" }).direction,
    "asc",
  );
});

test("filtros: solo los declarados", () => {
  const params = normalizeListParams(resource, {
    organization: "org-1",
    isActive: "true",
    injected: "x",
  });

  assert.deepEqual(params.filters, [
    { field: "organization", type: "relation", value: "org-1" },
    { field: "isActive", type: "boolean", value: "true" },
  ]);
});

test("búsqueda: solo campos String escalares", () => {
  const query = buildListQuery(
    resource,
    model,
    normalizeListParams(resource, { q: "ana" }),
  );

  assert.deepEqual(query.where, {
    OR: [
      { name: { contains: "ana", mode: "insensitive" } },
      { email: { contains: "ana", mode: "insensitive" } },
    ],
  });
});

test("ordenar por relación usa el campo display", () => {
  const query = buildListQuery(
    resource,
    model,
    normalizeListParams(resource, { sort: "organization", dir: "asc" }),
  );

  assert.deepEqual(query.orderBy, { organization: { name: "asc" } });
});

test("include: solo relaciones usadas y con su display", () => {
  const query = buildListQuery(
    resource,
    model,
    normalizeListParams(resource, {}),
  );

  assert.deepEqual(query.include, {
    organization: { select: { id: true, name: true } },
  });
});

test("filtros: coerción y descarte de valores inválidos", () => {
  const valid = buildListQuery(
    resource,
    model,
    normalizeListParams(resource, { isActive: "true", organization: "org-1" }),
  );
  assert.equal(valid.where.isActive, true);
  assert.deepEqual(valid.where.organization, { id: "org-1" });

  const invalid = buildListQuery(
    resource,
    model,
    normalizeListParams(resource, { isActive: "quizá", ghost: "x" }),
  );
  assert.equal("isActive" in invalid.where, false);
  // `ghost` no existe en el modelo: no llega a Prisma.
  assert.equal("ghost" in invalid.where, false);
});

test("paginación: skip y take", () => {
  const query = buildListQuery(
    resource,
    model,
    normalizeListParams(resource, { page: "3", perPage: "10" }),
  );
  assert.equal(query.skip, 20);
  assert.equal(query.take, 10);
});

test("DTO: tipos hostiles y relación aplanada", () => {
  const decimal = {
    toFixed: () => "1250.75",
    toJSON: () => "1250.75",
    toString: () => "1250.75",
  };

  const dto = toDTO(
    {
      id: "abc",
      name: "Ana",
      role: "ADMIN",
      balance: decimal,
      bigNumber: 9001n,
      metadata: { theme: "dark" },
      isActive: true,
      createdAt: new Date("2026-11-24T10:00:00.000Z"),
      organizationId: "org-1",
      organization: { id: "org-1", name: "Acme" },
    },
    model,
    resource,
    mappingContext(metadata),
  );

  assert.deepEqual(dto, {
    id: "abc",
    name: "Ana",
    role: "ADMIN",
    balance: "1250.75",
    bigNumber: "9001",
    metadata: { theme: "dark" },
    isActive: true,
    createdAt: "2026-11-24T10:00:00.000Z",
    organizationId: "org-1",
    organization: { id: "org-1", display: "Acme" },
  });

  // JSON.stringify no debe lanzar: es la prueba real de la frontera.
  assert.doesNotThrow(() => JSON.stringify(dto));
});

test("DTO: relación nula", () => {
  const dto = toDTO(
    { organization: null },
    model,
    resource,
    mappingContext(metadata),
  );
  assert.equal(dto.organization, null);
});
