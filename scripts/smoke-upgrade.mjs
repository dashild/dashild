#!/usr/bin/env node
/**
 * Upgrades a published alpha app to this checkout and builds it.
 *
 *   node scripts/smoke-upgrade.mjs
 *
 * It scaffolds with `create-dashild@<from>` from npm (the previous release),
 * runs this checkout's `dashild upgrade` to apply the dependency bump and glue
 * codemods, then installs the local tarballs and builds. The point is to catch
 * an upgrade path that only breaks after installing the new packages.
 */
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).version;
const args = process.argv.slice(2);
const fromIndex = args.indexOf("--from");
const from = fromIndex >= 0 ? args[fromIndex + 1] : "0.1.0-alpha.11";

if (!target) throw new Error("Could not read the target version.");

const workdir = mkdtempSync(join(tmpdir(), "dashild-upgrade-smoke-"));
const app = join(workdir, "app");
const env = {
  ...process.env,
  CI: "1",
  NEXT_TELEMETRY_DISABLED: "1",
};

function run(command, commandArgs, cwd) {
  console.log(`\n$ ${command} ${commandArgs.join(" ")}`);
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with ${result.status}`);
  }
}

try {
  console.log(`Upgrade smoke: ${from} -> ${target}`);

  run(
    "npx",
    [
      "--yes",
      `create-dashild@${from}`,
      "app",
      "--template",
      "demo",
      "--database",
      "sqlite",
      "--pm",
      "npm",
      "--yes",
    ],
    workdir,
  );

  run(
    process.execPath,
    [
      join(root, "packages/cli/dist/index.js"),
      "upgrade",
      "--cwd",
      app,
      "--to",
      target,
      "--no-install",
      "--no-generate",
    ],
    workdir,
  );

  const routePath = join(
    app,
    "src/app/admin/[[...dashild]]/page.tsx",
  );
  const route = readFileSync(routePath, "utf8");
  if (!route.includes("exportAction={exportResource}")) {
    throw new Error("Upgrade codemod did not add the CSV props to the route.");
  }
  if (!route.includes(`dashild:generated ${target}`)) {
    throw new Error("Upgrade did not refresh the route marker.");
  }

  const packageJsonPath = join(app, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  for (const section of ["dependencies", "devDependencies"]) {
    for (const name of Object.keys(packageJson[section] ?? {})) {
      if (name.startsWith("@dashild/")) {
        const base = name.split("/").at(-1);
        packageJson[section][name] =
          `file:${join(root, "artifacts", `dashild-${base}-${target}.tgz`)}`;
      }
    }
  }
  writeFileSync(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8",
  );

  const dashildJson = JSON.parse(
    readFileSync(join(app, "dashild.json"), "utf8"),
  );
  if (dashildJson.stackVersion !== target) {
    throw new Error("Upgrade did not record the stack version.");
  }

  run("npm", ["install"], app);
  run("npm", ["run", "build"], app);

  console.log(`\nUpgrade smoke passed: ${from} -> ${target}`);
  rmSync(workdir, { recursive: true, force: true });
} catch (error) {
  console.error(
    `\nUpgrade smoke failed: ${error instanceof Error ? error.message : error}`,
  );
  console.error(`Generated app kept at ${app}`);
  process.exitCode = 1;
}
