import assert from "node:assert/strict";
import { test } from "node:test";

import {
  definePolicies,
  type DashildMetadata,
  type FieldMetadata,
  type ModelMetadata,
  type ResourceDefinition,
} from "../src/index.js";
import { createDashildRuntime } from "../src/server.js";

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

const user: ModelMetadata = {
  name: "User",
  fields: [
    field({ name: "id", isId: true, isReadOnly: true }),
    field({ name: "name" }),
    field({ name: "role", type: "Role", kind: "enum" }),
    field({ name: "isActive", type: "Boolean" }),
    field({ name: "organizationId", isRequired: false }),
    field({
      name: "organization",
      type: "Organization",
      kind: "object",
      isRequired: false,
      relationName: "OrganizationToUser",
      relationFromFields: ["organizationId"],
    }),
  ],
};

const organization: ModelMetadata = {
  name: "Organization",
  fields: [field({ name: "id", isId: true }), field({ name: "name" })],
};

const metadata: DashildMetadata = {
  formatVersion: 1,
  schemaPath: "/tmp/schema.prisma",
  models: [user, organization],
  enums: [{ name: "Role", values: ["ADMIN", "USER"] }],
};

const resource: ResourceDefinition = {
  model: "User",
  navigation: { label: "Users", slug: "users" },
  table: {
    columns: [{ field: "name" }],
    filters: [
      { field: "role", type: "enum" },
      { field: "organization", type: "relation", display: "name" },
      { field: "isActive", type: "boolean" },
    ],
  },
  form: { fields: [] },
  policy: { scope: "organization" },
};

test("filterOptions resolves enum values and relation labels", async () => {
  const calls: unknown[] = [];
  const prisma = {
    organization: {
      findMany: async (args: unknown) => {
        calls.push(args);
        return [{ id: "org-1", name: "Acme" }];
      },
    },
  };

  const runtime = createDashildRuntime({
    prisma,
    metadata,
    resources: [resource],
    policies: definePolicies({
      resources: { User: { scope: () => ({}) } },
    }),
  });

  const options = await runtime.filterOptions(resource, { id: "user-1" });

  assert.deepEqual(options.role, [
    { value: "ADMIN", label: "ADMIN" },
    { value: "USER", label: "USER" },
  ]);
  assert.deepEqual(options.organization, [
    { value: "org-1", label: "Acme" },
  ]);
  assert.equal(options.isActive, undefined);

  assert.deepEqual(calls, [
    {
      where: {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    },
  ]);
});

test("filterOptions filters relation options by the active organization", async () => {
  const calls: unknown[] = [];
  const scopedOrganization: ModelMetadata = {
    ...organization,
    fields: [...organization.fields, field({ name: "organizationId" })],
  };

  const prisma = {
    organization: {
      findMany: async (args: unknown) => {
        calls.push(args);
        return [];
      },
    },
  };

  const runtime = createDashildRuntime({
    prisma,
    metadata: { ...metadata, models: [user, scopedOrganization] },
    resources: [resource],
    policies: definePolicies({
      organizationOf: async () => "org-9",
      resources: { User: { scope: () => ({}) } },
    }),
  });

  await runtime.filterOptions(resource, { id: "user-1" });

  assert.deepEqual(calls, [
    {
      where: { organizationId: "org-9" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    },
  ]);
});

test("filterOptions keeps a broken relation from failing the list", async () => {
  const prisma = {
    organization: {
      findMany: async () => {
        throw new Error("boom");
      },
    },
  };

  const runtime = createDashildRuntime({
    prisma,
    metadata,
    resources: [resource],
    policies: definePolicies({
      resources: { User: { scope: () => ({}) } },
    }),
  });

  const options = await runtime.filterOptions(resource, { id: "user-1" });
  assert.deepEqual(options.organization, []);
});
