import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type {
  DashildMetadata,
  FieldMetadata,
  ModelMetadata,
} from "@dashild/core";

import {
  analyzeResourceSource,
  runDoctor,
} from "../src/doctor.js";

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
    field({
      name: "organization",
      type: "Organization",
      kind: "object",
      isRequired: false,
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
  enums: [],
};

const valid = `import { defineResource } from "@dashild/core";

export const userResource = defineResource({
  model: "User",
  navigation: { label: "Users", slug: "users" },
  policy: { scope: "organization" },
  table: {
    columns: [{ field: "name" }, { field: "organization", display: "name" }],
  },
  form: { fields: [{ field: "name", type: "text" }] },
});
`;

test("doctor: a valid resource has no issues", () => {
  const report = analyzeResourceSource(valid, "user.ts", metadata);
  assert.equal(report.model, "User");
  assert.equal(report.slug, "users");
  assert.deepEqual(report.issues, []);
});

test("doctor: a missing field is reported with file and line", () => {
  const source = valid.replace('{ field: "name" }', '{ field: "legacyCode" }');
  const report = analyzeResourceSource(source, "user.ts", metadata);
  const issue = report.issues.find((entry) =>
    entry.message.includes("legacyCode"),
  );

  assert.ok(issue);
  assert.equal(issue.severity, "error");
  assert.equal(issue.file, "user.ts");
  assert.equal(issue.line, 8);
  assert.match(issue.suggestion ?? "", /add the field/);
});

test("doctor: a resource without policy fails closed", () => {
  const source = valid.replace('  policy: { scope: "organization" },\n', "");
  const report = analyzeResourceSource(source, "user.ts", metadata);
  const issue = report.issues.find((entry) =>
    entry.message.includes("no policy"),
  );

  assert.ok(issue);
  assert.equal(issue.severity, "error");
  assert.equal(issue.line, 3);
});

test("doctor: a model missing from metadata is an error", () => {
  const source = valid.replace('model: "User"', 'model: "Ghost"');
  const report = analyzeResourceSource(source, "user.ts", metadata);
  const issue = report.issues.find((entry) =>
    entry.message.includes("Ghost"),
  );

  assert.ok(issue);
  assert.equal(issue.severity, "error");
  assert.equal(issue.line, 4);
});

test("doctor: a relation display field must exist", () => {
  const source = valid.replace('display: "name"', 'display: "missing"');
  const report = analyzeResourceSource(source, "user.ts", metadata);
  const issue = report.issues.find((entry) =>
    entry.message.includes("missing"),
  );

  assert.ok(issue);
  assert.equal(issue.severity, "error");
});

test("doctor: duplicate slugs are reported in both files", () => {
  const directory = mkdtempSync(join(tmpdir(), "dashild-doctor-"));

  try {
    const metadataPath = join(
      directory,
      "src/generated/dashild/dashild-metadata.json",
    );
    mkdirSync(join(directory, "src/generated/dashild"), { recursive: true });
    writeFileSync(metadataPath, JSON.stringify(metadata), "utf8");

    const resources = join(directory, "src/dashild/resources");
    mkdirSync(resources, { recursive: true });
    mkdirSync(join(directory, "src/dashild/actions"), { recursive: true });
    writeFileSync(
      join(directory, "src/dashild/policies.ts"),
      `import { definePolicies } from "@dashild/core";
export const policies = definePolicies({
  resources: {
    User: { scope: () => ({}) },
    Organization: { scope: () => ({}) },
  },
});
`,
      "utf8",
    );
    writeFileSync(join(resources, "user.ts"), valid, "utf8");
    const ghost = valid
      .replace('model: "User"', 'model: "Organization"')
      .replace('{ field: "organization", display: "name" }', "");
    writeFileSync(join(resources, "ghost.ts"), ghost, "utf8");

    const report = runDoctor({
      cwd: directory,
      dir: "src/dashild/resources",
    });

    assert.equal(report.ok, false);
    assert.equal(report.errors, 2);
    assert.equal(
      report.resources.filter((resource) =>
        resource.issues.some((issue) => issue.message.includes("Duplicate")),
      ).length,
      2,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("doctor: checks policies and action handlers", () => {
  const directory = mkdtempSync(join(tmpdir(), "dashild-doctor-policy-"));

  try {
    mkdirSync(join(directory, "src/generated/dashild"), { recursive: true });
    mkdirSync(join(directory, "src/dashild/resources"), { recursive: true });
    mkdirSync(join(directory, "src/dashild/actions"), { recursive: true });

    writeFileSync(
      join(directory, "src/generated/dashild/dashild-metadata.json"),
      JSON.stringify(metadata),
      "utf8",
    );

    writeFileSync(
      join(directory, "src/dashild/resources/user.ts"),
      `import { defineResource } from "@dashild/core";

export const userResource = defineResource({
  model: "User",
  navigation: { label: "Users", slug: "users" },
  policy: { scope: "organization" },
  table: {
    columns: [{ field: "name" }],
    actions: [{ name: "export", requires: "export" }],
  },
  form: { fields: [{ field: "name", type: "text" }] },
});
`,
      "utf8",
    );

    writeFileSync(
      join(directory, "src/dashild/policies.ts"),
      `import { definePolicies } from "@dashild/core";

export const policies = definePolicies({
  resources: {
    User: { scope: () => ({}) },
  },
});
`,
      "utf8",
    );

    writeFileSync(
      join(directory, "src/dashild/actions/index.ts"),
      `export const resourceActions = { User: {} };\n`,
      "utf8",
    );

    const first = runDoctor({
      cwd: directory,
      dir: "src/dashild/resources",
    });

    assert.ok(
      first.resources[0]?.issues.some((issue) =>
        issue.message.includes('Action "export" has no handler'),
      ),
    );
    assert.ok(
      first.resources[0]?.issues.some((issue) =>
        issue.message.includes('requires policy "export"'),
      ),
    );

    writeFileSync(
      join(directory, "src/dashild/actions/index.ts"),
      `export const resourceActions = {\n  User: { export: async () => ({ ok: true }) },\n} satisfies Record<string, Record<string, unknown>>;\n`,
      "utf8",
    );
    writeFileSync(
      join(directory, "src/dashild/policies.ts"),
      `import { definePolicies } from "@dashild/core";

export const policies = definePolicies({
  resources: {
    User: {
      scope: () => ({}),
      can: { export: () => true },
    },
  },
});
`,
      "utf8",
    );

    const second = runDoctor({
      cwd: directory,
      dir: "src/dashild/resources",
    });

    assert.equal(second.errors, 0);
    assert.equal(second.resources[0]?.issues.length, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("doctor: a missing policy entry is an error when policies.ts exists", () => {
  const directory = mkdtempSync(join(tmpdir(), "dashild-doctor-entry-"));

  try {
    mkdirSync(join(directory, "src/generated/dashild"), { recursive: true });
    mkdirSync(join(directory, "src/dashild/resources"), { recursive: true });
    mkdirSync(join(directory, "src/dashild/actions"), { recursive: true });

    writeFileSync(
      join(directory, "src/generated/dashild/dashild-metadata.json"),
      JSON.stringify(metadata),
      "utf8",
    );
    writeFileSync(
      join(directory, "src/dashild/resources/user.ts"),
      `import { defineResource } from "@dashild/core";
export const userResource = defineResource({
  model: "User",
  navigation: { label: "Users", slug: "users" },
  policy: { scope: "organization" },
  table: { columns: [{ field: "name" }] },
  form: { fields: [{ field: "name", type: "text" }] },
});
`,
      "utf8",
    );
    writeFileSync(
      join(directory, "src/dashild/policies.ts"),
      `import { definePolicies } from "@dashild/core";
export const policies = definePolicies({
  resources: {
    Organization: { scope: () => ({}) },
  },
});
`,
      "utf8",
    );

    const report = runDoctor({
      cwd: directory,
      dir: "src/dashild/resources",
    });

    assert.ok(
      report.resources[0]?.issues.some((issue) =>
        issue.message.includes('No policy entry for model "User"'),
      ),
    );
    assert.equal(report.errors, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
