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
  fields: [field({ name: "id", isId: true }), field({ name: "name" })],
};

const userWithOrganization: ModelMetadata = {
  name: "User",
  fields: [
    field({ name: "id", isId: true }),
    field({ name: "name" }),
    field({ name: "organizationId", isRequired: false }),
  ],
};

const post: ModelMetadata = {
  name: "Post",
  fields: [
    field({ name: "id", isId: true }),
    field({ name: "title" }),
    field({ name: "authorId" }),
    field({
      name: "author",
      type: "User",
      kind: "object",
      relationName: "PostAuthor",
      relationFromFields: ["authorId"],
    }),
  ],
};

const resource: ResourceDefinition = {
  model: "Post",
  navigation: { label: "Posts", slug: "posts" },
  table: { columns: [{ field: "title" }] },
  form: {
    fields: [
      {
        field: "author",
        type: "relation",
        relation: "author",
        display: "name",
        rules: { required: true },
      },
    ],
  },
  policy: { scope: "public" },
};

function metadata(users: ModelMetadata): DashildMetadata {
  return {
    formatVersion: 1,
    schemaPath: "/tmp/schema.prisma",
    models: [post, users],
    enums: [],
  };
}

test("formOptions lists relation options without a tenant", async () => {
  const calls: unknown[] = [];
  const prisma = {
    user: {
      findMany: async (args: unknown) => {
        calls.push(args);
        return [{ id: "user-1", name: "Ana Torres" }];
      },
    },
  };

  const runtime = createDashildRuntime({
    prisma,
    metadata: metadata(user),
    resources: [resource],
    policies: definePolicies({
      resources: { Post: { scope: () => ({}) } },
    }),
  });

  const options = await runtime.formOptions(resource, { id: "user-1" });

  assert.deepEqual(options.author, [
    { value: "user-1", label: "Ana Torres" },
  ]);
  assert.deepEqual(calls, [
    {
      where: {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    },
  ]);
});

test("formOptions leaves tenant relations empty without an organization", async () => {
  let called = false;
  const prisma = {
    user: {
      findMany: async () => {
        called = true;
        return [];
      },
    },
  };

  const runtime = createDashildRuntime({
    prisma,
    metadata: metadata(userWithOrganization),
    resources: [resource],
    policies: definePolicies({
      resources: { Post: { scope: () => ({}) } },
    }),
  });

  const options = await runtime.formOptions(resource, { id: "user-1" });

  assert.deepEqual(options.author, []);
  assert.equal(called, false);
});
