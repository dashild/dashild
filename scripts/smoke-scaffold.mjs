#!/usr/bin/env node
/**
 * Generates a real app from the packed tarballs and takes it to a production
 * build. This is the guard against broken releases: missing tarballs, missing
 * exports, native bindings built for the wrong ABI, or generated code that
 * does not compile.
 *
 * Usage:
 *   pnpm build && pnpm pack:all
 *   node scripts/smoke-scaffold.mjs --pm pnpm --database sqlite
 *   node scripts/smoke-scaffold.mjs --pm npm --database postgresql --url postgresql://...
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [key, inline] = arg.slice(2).split("=", 2);
    parsed[key] = inline ?? argv[index + 1];
    if (inline === undefined) index += 1;
  }
  return parsed;
}

const args = parseArgs(process.argv.slice(2));
const packageManager = args.pm ?? "npm";
const database = args.database ?? "sqlite";
const template = args.template ?? "demo";
const databaseUrl =
  args.url ??
  (database === "postgresql" ? process.env.DATABASE_URL : undefined);

if (!["npm", "pnpm"].includes(packageManager)) {
  throw new Error(`Unsupported package manager for the smoke test: ${packageManager}`);
}

function run(command, commandArgs, cwd, env = {}) {
  const printable = [command, ...commandArgs].join(" ");
  console.log(`\n$ ${printable}`);
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "1", ...env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${printable} exited with code ${result.status}`);
  }
}

function installCommand() {
  return packageManager === "pnpm"
    ? { command: "pnpm", args: ["install"] }
    : { command: "npm", args: ["install"] };
}

function execCommand(bin, binArgs) {
  return packageManager === "pnpm"
    ? { command: "pnpm", args: ["exec", bin, ...binArgs] }
    : { command: "npx", args: [bin, ...binArgs] };
}

function buildCommand() {
  return packageManager === "pnpm"
    ? { command: "pnpm", args: ["build"] }
    : { command: "npm", args: ["run", "build"] };
}

const artifacts = join(root, "artifacts");
const tarballs = readdirSync(artifacts).filter((file) => file.endsWith(".tgz"));
const packages = {
  "@dashild/core": "dashild-core",
  "@dashild/prisma": "dashild-prisma",
  "@dashild/admin": "dashild-admin",
  "@dashild/cli": "dashild-cli",
};

const specs = new Map();
for (const [name, prefix] of Object.entries(packages)) {
  const file = tarballs.find((candidate) => candidate.startsWith(`${prefix}-`));
  if (!file) throw new Error(`No tarball for ${name} in ${artifacts}`);
  specs.set(name, `file:${join(artifacts, file)}`);
}

const workdir = mkdtempSync(join(tmpdir(), "dashild-smoke-"));
const project = join(workdir, "app");
const nodeEnv = {
  PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
  npm_config_target: process.versions.node,
  npm_config_arch: process.arch,
  NEXT_TELEMETRY_DISABLED: "1",
};

try {
  console.log(
    `Scaffolding ${template} with ${packageManager} + ${database} in ${workdir}`,
  );

  const scaffoldArgs = [
    join(root, "packages/create-dashild/dist/index.js"),
    "app",
    "--template",
    template,
    "--database",
    database,
    "--pm",
    packageManager,
    "--no-install",
    "--no-git",
    "--yes",
  ];
  if (databaseUrl) scaffoldArgs.push("--database-url", databaseUrl);
  run(process.execPath, scaffoldArgs, workdir, nodeEnv);

  // Point the generated app at this checkout's packages, not at npm.
  const packageJsonPath = join(project, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  for (const section of ["dependencies", "devDependencies"]) {
    const entries = packageJson[section];
    if (!entries) continue;
    for (const [name, spec] of specs) {
      if (entries[name]) entries[name] = spec;
    }
  }

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  if (packageManager === "pnpm") {
    // pnpm 12 ignores `pnpm.overrides` in package.json. Its workspace file
    // already carries allowBuilds from create-dashild; append the overrides
    // without dropping it.
    const workspacePath = join(project, "pnpm-workspace.yaml");
    const existing = existsSync(workspacePath)
      ? readFileSync(workspacePath, "utf8").trimEnd()
      : "";
    if (!existing.includes("overrides:")) {
      const overrides = [
        "overrides:",
        ...[...specs].map(
          ([name, spec]) => `  ${JSON.stringify(name)}: ${JSON.stringify(spec)}`,
        ),
      ].join("\n");
      writeFileSync(
        workspacePath,
        `${existing}${existing ? "\n" : ""}${overrides}\n`,
      );
    }
  }

  run(installCommand().command, installCommand().args, project, nodeEnv);

  const migrate = execCommand("prisma", ["migrate", "dev", "--name", "init"]);
  run(migrate.command, migrate.args, project, nodeEnv);

  if (template === "demo") {
    const seed = execCommand("tsx", ["prisma/seed.ts"]);
    run(seed.command, seed.args, project, nodeEnv);
  }

  const build = buildCommand();
  run(build.command, build.args, project, nodeEnv);

  console.log(`\nScaffold smoke passed: ${template} / ${packageManager} / ${database}`);
  rmSync(workdir, { recursive: true, force: true });
} catch (error) {
  console.error(`\nScaffold smoke failed: ${error instanceof Error ? error.message : error}`);
  console.error(`Generated app kept at ${project}`);
  process.exitCode = 1;
}
