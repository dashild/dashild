import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { DASHILD_VERSION } from "../src/scaffold.js";
import {
  applyTemplate,
  loadTemplate,
  validateTemplate,
} from "../src/template.js";

function write(root: string, path: string, content: string): void {
  const full = join(root, path);
  mkdirSync(resolve(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf8");
}

function project(): string {
  return mkdtempSync(join(tmpdir(), "dashild-template-"));
}

function fixture(root: string): void {
  write(
    root,
    "prisma/schema.prisma",
    `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

model User {
  id    String @id
  email String @unique
}
`,
  );
  write(
    root,
    "src/dashild/panel.ts",
    `import { definePanel } from "@dashild/core";

export const panel = definePanel({
  resources: [],
});
`,
  );
  write(
    root,
    "src/dashild/policies.ts",
    `import { definePolicies } from "@dashild/core";

export const policies = definePolicies({
  resources: {},
});
`,
  );
  write(root, "package.json", `${JSON.stringify({ name: "fixture" }, null, 2)}\n`);
}

test("the basic starter has no files", async () => {
  const template = await loadTemplate("basic", "en");
  assert.equal(template.manifest.name, "basic");
  assert.equal(template.files.size, 0);
});

test("the bundled demo starter exposes its manifest", async () => {
  const template = await loadTemplate("demo", "en");
  assert.equal(template.manifest.name, "demo");
  assert.equal(template.source, "bundled");
  assert.deepEqual(template.manifest.requires?.auth, ["better-auth"]);
  assert.ok(template.files.has("prisma/models.prisma"));
  assert.ok(template.files.has("src/dashild/resources/post.ts"));
  assert.ok(template.files.has("prisma/seed.ts"));
});

test("templates are validated against auth, provider and version", async () => {
  const template = await loadTemplate("demo", "en");

  assert.throws(
    () =>
      validateTemplate(template, {
        auth: "none",
        database: "postgresql",
        dashildVersion: DASHILD_VERSION,
        locale: "en",
      }),
    /Better Auth|better-auth/i,
  );

  assert.doesNotThrow(() =>
    validateTemplate(template, {
      auth: "better-auth",
      database: "sqlite",
      dashildVersion: DASHILD_VERSION,
      locale: "en",
    }),
  );

  assert.throws(
    () =>
      validateTemplate(template, {
        auth: "better-auth",
        database: "postgresql",
        dashildVersion: "0.0.1",
        locale: "en",
      }),
    /Dashild/,
  );
});

test("unknown starters and broken manifests fail with a message", async () => {
  await assert.rejects(() => loadTemplate("nope", "en"), /Starter not found/);

  const root = project();
  try {
    write(root, "template.json", "{ not json");
    await assert.rejects(
      () => loadTemplate(`local:${root}`, "en"),
      /Invalid template.json/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a local starter is read from template.json and its files", async () => {
  const root = project();
  try {
    write(
      root,
      "template.json",
      JSON.stringify({
        name: "local-demo",
        version: "1.0.0",
        dashild: "*",
        dependencies: { dayjs: "^1.11.0" },
      }),
    );
    write(root, "src/dashild/resources/thing.ts", "export const thing = {};\n");
    write(root, "notes.md", "outside the allowed folders\n");

    const template = await loadTemplate(`local:${root}`, "en");
    assert.equal(template.manifest.name, "local-demo");
    assert.equal(template.files.get("src/dashild/resources/thing.ts"), "export const thing = {};\n");
    assert.equal(template.files.has("notes.md"), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applying the demo starter writes the schema, resources and seed", async () => {
  const root = project();
  try {
    fixture(root);
    const template = await loadTemplate("demo", "en");

    const result = applyTemplate({
      projectDir: root,
      template,
      auth: "better-auth",
      database: "postgresql",
      schemaPath: join(root, "prisma/schema.prisma"),
      panelFile: join(root, "src/dashild/panel.ts"),
      policiesFile: join(root, "src/dashild/policies.ts"),
      libDir: join(root, "src/lib"),
      packageJsonPath: join(root, "package.json"),
      locale: "en",
    });

    assert.deepEqual(result.resources.sort(), ["Label", "Post", "User"]);
    assert.equal(result.hasSeed, true);
    assert.deepEqual(result.warnings, []);

    const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
    assert.match(schema, /\/\/ --- dashild template: demo ---/);
    assert.match(schema, /enum Role/);
    assert.match(schema, /model Post \{/);
    assert.match(schema, /model Label \{/);
    assert.match(schema, /role\s+Role\s+@default\(USER\)/);
    assert.match(schema, /posts\s+Post\[\]/);
    assert.match(schema, /labels\s+Label\[\]/);

    const panel = readFileSync(join(root, "src/dashild/panel.ts"), "utf8");
    assert.match(panel, /import \{ postResource \}/);
    assert.match(panel, /userResource/);
    assert.match(panel, /labelResource/);

    const policies = readFileSync(join(root, "src/dashild/policies.ts"), "utf8");
    assert.match(policies, /Demo policies/);
    assert.match(policies, /Post:/);

    const seed = readFileSync(join(root, "prisma/seed.ts"), "utf8");
    assert.match(seed, /from "\.\.\/src\/lib\/auth"/);
    assert.match(seed, /dashild123/);

    assert.equal(
      readFileSync(join(root, "package.json"), "utf8"),
      `${JSON.stringify({ name: "fixture" }, null, 2)}\n`,
    );

    assert.throws(
      () =>
        applyTemplate({
          projectDir: root,
          template,
          auth: "better-auth",
          database: "postgresql",
          schemaPath: join(root, "prisma/schema.prisma"),
          panelFile: join(root, "src/dashild/panel.ts"),
          policiesFile: join(root, "src/dashild/policies.ts"),
          libDir: join(root, "src/lib"),
          packageJsonPath: join(root, "package.json"),
          locale: "en",
        }),
      /already applied/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a starter model that already exists is rejected", async () => {
  const root = project();
  try {
    fixture(root);
    write(
      root,
      "prisma/schema.prisma",
      `${readFileSync(join(root, "prisma/schema.prisma"), "utf8")}
model Post {
  id String @id
}
`,
    );
    const template = await loadTemplate("demo", "en");

    assert.throws(
      () =>
        applyTemplate({
          projectDir: root,
          template,
          auth: "better-auth",
          database: "postgresql",
          schemaPath: join(root, "prisma/schema.prisma"),
          panelFile: join(root, "src/dashild/panel.ts"),
          policiesFile: join(root, "src/dashild/policies.ts"),
          libDir: join(root, "src/lib"),
          packageJsonPath: join(root, "package.json"),
          locale: "en",
        }),
      /already exists/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
