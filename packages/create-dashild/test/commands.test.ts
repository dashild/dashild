import assert from "node:assert/strict";
import { test } from "node:test";

import { rebuildCommand, scriptCommand } from "../src/commands.js";

test("npm scripts need npm run", () => {
  assert.equal(scriptCommand("npm", "db:seed"), "npm run db:seed");
  assert.equal(scriptCommand("pnpm", "db:seed"), "pnpm db:seed");
  assert.equal(scriptCommand("yarn", "db:seed"), "yarn db:seed");
  assert.equal(scriptCommand("bun", "db:seed"), "bun run db:seed");
});

test("native rebuilds use each package manager's command", () => {
  assert.deepEqual(rebuildCommand("npm", "better-sqlite3"), {
    command: "npm",
    args: ["rebuild", "better-sqlite3", "--foreground-scripts"],
  });
  assert.deepEqual(rebuildCommand("pnpm", "better-sqlite3"), {
    command: "pnpm",
    args: ["rebuild", "better-sqlite3"],
  });
  assert.equal(rebuildCommand("yarn", "better-sqlite3").command, "yarn");
  assert.equal(rebuildCommand("bun", "better-sqlite3").command, "bun");
});
