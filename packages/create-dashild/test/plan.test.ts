import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";

import { formatNextSteps, formatPlan } from "../src/plan.js";
import type { CreateOptions, CreateResult } from "../src/types.js";

function options(overrides: Partial<CreateOptions> = {}): CreateOptions {
  return {
    name: "demo-app",
    dir: resolve(process.cwd(), "demo-app"),
    template: "demo",
    auth: "better-auth",
    database: "postgresql",
    databaseUrl: "postgresql://user:pw@host/db",
    packageManager: "pnpm",
    install: true,
    git: true,
    migrate: true,
    seed: true,
    panelPath: "/admin",
    locale: "en",
    yes: false,
    dryRun: false,
    tenancy: false,
    ...overrides,
  };
}

function result(overrides: Partial<CreateResult> = {}): CreateResult {
  return {
    projectDir: resolve(process.cwd(), "demo-app"),
    template: "demo",
    warnings: [],
    pending: [],
    hasSeed: true,
    seeded: true,
    ...overrides,
  };
}

test("the dry-run plan summarises every decision", () => {
  const lines = formatPlan(options(), "bundled", "en").join("\n");
  assert.match(lines, /Project: demo-app \(demo-app\)/);
  assert.match(lines, /Starter: demo \(bundled\)/);
  assert.match(lines, /Auth: better-auth/);
  assert.match(lines, /Database: postgresql/);
  assert.match(lines, /Panel route: \/admin/);
  assert.match(lines, /Install: yes \(pnpm\)/);
  assert.match(lines, /Migrate: yes/);
  assert.match(lines, /Seed: yes/);
  assert.match(lines, /Git: yes/);
});

test("the plan marks a missing database URL as pending", () => {
  const lines = formatPlan(
    options({ databaseUrl: "", database: "postgresql" }),
    "bundled",
    "en",
  ).join("\n");
  assert.match(lines, /Database: postgresql \(DATABASE_URL pending\)/);
  assert.match(lines, /Migrate: skip/);
});

test("the plan can be printed in Spanish", () => {
  const lines = formatPlan(options(), "bundled", "es").join("\n");
  assert.match(lines, /Proyecto: demo-app/);
  assert.match(lines, /Base de datos: postgresql/);
});

test("next steps list the pending commands before dev", () => {
  const lines = formatNextSteps(
    options(),
    result({ pending: ["pnpm install", "pnpm db:migrate"] }),
    "en",
  );

  assert.equal(lines[0], "cd demo-app");
  assert.deepEqual(lines.slice(1, 3), ["pnpm install", "pnpm db:migrate"]);
  assert.ok(lines.includes("pnpm dev"));
  assert.ok(lines.includes("Panel: http://localhost:3000/admin"));
  assert.ok(lines.includes("Login: ana@acme.test / dashild123"));
  assert.equal(lines.at(-1), "Docs: https://github.com/dashild/dashild");
});

test("npm scripts need npm run", () => {
  const lines = formatNextSteps(
    options({ packageManager: "npm" }),
    result(),
    "en",
  );
  assert.ok(lines.includes("npm run dev"));
});

test("next steps point at panel.ts when auth is not scaffolded", () => {
  const lines = formatNextSteps(
    options({ auth: "none", template: "basic" }),
    result({ hasSeed: false, seeded: false }),
    "en",
  );

  assert.ok(lines.some((line) => line.includes("src/dashild/panel.ts")));
  assert.ok(!lines.some((line) => line.startsWith("Login:")));
});
