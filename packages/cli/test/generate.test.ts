/**
 * Scaffold specification.
 *
 * It does not write files: it verifies the generated text. Writing and the
 * write-once policy are tested by running the command in the playground.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  DashildMetadata,
  FieldMetadata,
  ModelMetadata,
} from "@dashild/core";

import { generateResourceFile } from "../src/generate.js";
import {
  resourceFileName,
  resourceLabel,
  resourceSlug,
} from "../src/naming.js";

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
    field({ name: "email" }),
    field({ name: "name" }),
    field({ name: "role", type: "Role", kind: "enum" }),
    field({ name: "balance", type: "Decimal" }),
    field({ name: "bigNumber", type: "BigInt" }),
    field({ name: "metadata", type: "Json", isRequired: false }),
    field({ name: "avatar", type: "Bytes", isRequired: false }),
    field({ name: "bio", nativeType: "Text", isRequired: false }),
    field({ name: "isActive", type: "Boolean", hasDefaultValue: true }),
    field({ name: "createdAt", type: "DateTime", hasDefaultValue: true }),
    field({
      name: "updatedAt",
      type: "DateTime",
      isUpdatedAt: true,
      isReadOnly: true,
    }),
    field({ name: "organizationId", isReadOnly: true }),
    field({
      name: "organization",
      type: "Organization",
      kind: "object",
      isRequired: false,
      relationName: "OrganizationToUser",
      relationFromFields: ["organizationId"],
    }),
    field({
      name: "posts",
      type: "Post",
      kind: "object",
      isList: true,
      isRequired: true,
    }),
  ],
};

const metadata: DashildMetadata = {
  formatVersion: 1,
  schemaPath: "/tmp/schema.prisma",
  models: [
    {
      name: "Organization",
      fields: [field({ name: "id", isId: true }), field({ name: "name" })],
    },
    model,
    {
      name: "Post",
      fields: [field({ name: "id", isId: true }), field({ name: "title" })],
    },
  ],
  enums: [{ name: "Role", values: ["ADMIN", "USER"] }],
};

test("names: plural slug, label and singular file", () => {
  assert.equal(resourceSlug("User"), "users");
  assert.equal(resourceSlug("Category"), "categories");
  assert.equal(resourceSlug("BlogPost"), "blog-posts");
  assert.equal(resourceLabel("BlogPost"), "Blog Posts");
  assert.equal(resourceFileName("BlogPost"), "blog-post.ts");
});

test("generates the resource with model, navigation and table", () => {
  const file = generateResourceFile(metadata, "User");

  assert.match(file, /model: "User"/);
  assert.match(file, /policy: \{ scope: "default" \}/);
  assert.match(file, /label: "Users"/);
  assert.match(file, /slug: "users"/);
  assert.match(file, /pageSize: 25/);
  assert.match(file, /searchable: \["name", "email"\]/);
  assert.match(
    file,
    /field: "organization", label: "Organization", sortable: true, display: "name"/,
  );
  assert.match(file, /field: "role", label: "Role", sortable: true, format: "badge"/);
  assert.match(file, /field: "balance", label: "Balance", sortable: true, format: "number"/);
  assert.match(file, /field: "createdAt", label: "Created At", sortable: true, format: "datetime"/);
});

test("omits id, updatedAt, FK and Bytes from the table", () => {
  const file = generateResourceFile(metadata, "User");

  assert.doesNotMatch(file, /field: "id"/);
  assert.doesNotMatch(file, /field: "updatedAt"/);
  assert.doesNotMatch(file, /field: "organizationId"/);
  assert.doesNotMatch(file, /field: "avatar"/);
  assert.doesNotMatch(file, /field: "posts"/);
});

test("form: types, required and audit fields excluded", () => {
  const file = generateResourceFile(metadata, "User");
  const form = file.slice(file.indexOf("form: {"));

  assert.match(
    form,
    /field: "email", type: "email", label: "Email", rules: \{ required: true \}/,
  );
  assert.match(form, /field: "bio", type: "textarea", label: "Bio"/);
  assert.match(form, /field: "role", type: "select", label: "Role"/);
  assert.match(form, /field: "metadata", type: "json", label: "Metadata"/);
  assert.match(form, /field: "bigNumber", type: "number", label: "Big Number"/);
  assert.match(
    form,
    /field: "organization", type: "relation", label: "Organization", relation: "organization", display: "name"/,
  );

  assert.doesNotMatch(form, /"createdAt"/);
  assert.doesNotMatch(form, /"updatedAt"/);
  assert.doesNotMatch(form, /"organizationId"/);
});

test("filters: enum, boolean and relation", () => {
  const file = generateResourceFile(metadata, "User");

  assert.match(
    file,
    /field: "role", type: "enum", label: "Role"/,
  );
  assert.match(
    file,
    /field: "isActive", type: "boolean", label: "Is Active"/,
  );
  assert.match(
    file,
    /field: "organization", type: "relation", label: "Organization", display: "name"/,
  );
});

test("unknown model: error lists available models", () => {
  assert.throws(
    () => generateResourceFile(metadata, "Ghost"),
    /Ghost.*not in the metadata|Ghost.*no está/,
  );
});
