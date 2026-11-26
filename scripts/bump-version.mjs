#!/usr/bin/env node
/**
 * Bumps the lockstep stack version and the version generated apps install.
 *
 *   pnpm release:bump 0.1.0-alpha.7
 *
 * It does not publish, commit, or edit the changelog; those stay deliberate.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const version = args.find((arg) => !arg.startsWith("--"));

if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Usage: pnpm release:bump <version> [--dry-run]");
  process.exit(1);
}

const packageFiles = [
  "package.json",
  "packages/core/package.json",
  "packages/prisma/package.json",
  "packages/admin/package.json",
  "packages/cli/package.json",
  "packages/create-dashild/package.json",
];

const changed = [];
for (const file of packageFiles) {
  const path = join(root, file);
  const data = JSON.parse(readFileSync(path, "utf8"));
  data.version = version;
  if (file.endsWith("create-dashild/package.json")) {
    data.dashildPackages = version;
  }
  if (!dryRun) {
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  }
  changed.push(file);
}

// Documentation mentions the current alpha version in examples.
const textFiles = [
  "README.md",
  "packages/create-dashild/README.md",
  "apps/docs/src/content/docs/reference/templates.mdx",
  "apps/docs/src/content/docs/es/reference/templates.mdx",
];
const versionPattern = /0\.1\.0-alpha\.\d+/g;

for (const file of textFiles) {
  const path = join(root, file);
  const source = readFileSync(path, "utf8");
  const next = source.replace(versionPattern, version);
  if (next !== source) {
    if (!dryRun) writeFileSync(path, next);
    changed.push(file);
  }
}

console.log(
  `${dryRun ? "Would bump" : "Bumped"} ${changed.length} files to ${version}:`,
);
for (const file of changed) console.log(`  ${file}`);
