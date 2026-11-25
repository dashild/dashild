#!/usr/bin/env node
/**
 * Confirms every workspace package tarball is actually downloadable.
 *
 * npm can register a version while losing its tarball (or skip a package
 * entirely), which only shows up when someone installs it. Run this after
 * publishing and before announcing a release.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = (
  process.env.npm_config_registry ?? "https://registry.npmjs.org"
).replace(/\/$/, "");

const packages = [
  ["@dashild/core", "packages/core"],
  ["@dashild/prisma", "packages/prisma"],
  ["@dashild/admin", "packages/admin"],
  ["@dashild/cli", "packages/cli"],
  ["create-dashild", "packages/create-dashild"],
];

const results = await Promise.all(
  packages.map(async ([name, directory]) => {
    const { version } = JSON.parse(
      readFileSync(join(root, directory, "package.json"), "utf8"),
    );
    const file = `${name.split("/").at(-1)}-${version}.tgz`;
    const url = `${registry}/${name}/-/${file}`;

    try {
      const response = await fetch(url, { method: "HEAD", redirect: "follow" });
      return { name, version, status: response.status, url };
    } catch (error) {
      return {
        name,
        version,
        status: error instanceof Error ? error.message : String(error),
        url,
      };
    }
  }),
);

for (const result of results) {
  console.log(`${result.status} ${result.name}@${result.version}`);
}

const missing = results.filter((result) => result.status !== 200);
if (missing.length > 0) {
  console.error(
    `\n${missing.length} tarball(s) missing. Republish those packages before announcing the release.`,
  );
  for (const result of missing) {
    console.error(`  ${result.url}`);
  }
  process.exit(1);
}
