#!/usr/bin/env node
/**
 * Generates a real app with create-dashild, using this checkout's tarballs,
 * and takes it to a production build. This is the guard against broken
 * releases: missing tarballs, missing exports, native bindings built for the
 * wrong ABI, or generated code that does not compile.
 *
 * Usage:
 *   pnpm build && pnpm pack:all
 *   node scripts/smoke-scaffold.mjs --pm pnpm --database sqlite
 *   node scripts/smoke-scaffold.mjs --pm npm --database postgresql --url postgresql://...
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
// dotenv does not override an existing DATABASE_URL. CI sets a Postgres URL at
// job level, so pin the app's own URL for every command.
const appDatabaseUrl =
  database === "sqlite" ? "file:./prisma/dev.db" : databaseUrl;

if (!["npm", "pnpm"].includes(packageManager)) {
  throw new Error(
    `Unsupported package manager for the smoke test: ${packageManager}`,
  );
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

const workdir = mkdtempSync(join(tmpdir(), "dashild-smoke-"));
const project = join(workdir, "app");
const nodeEnv = {
  PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
  npm_config_target: process.versions.node,
  npm_config_arch: process.arch,
  NEXT_TELEMETRY_DISABLED: "1",
  // create-dashild resolves the four packages from this folder instead of npm.
  DASHILD_PACKAGES_FROM: join(root, "artifacts"),
  ...(appDatabaseUrl ? { DATABASE_URL: appDatabaseUrl } : {}),
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
    "--no-git",
    "--yes",
  ];
  if (database !== "sqlite" && databaseUrl) {
    scaffoldArgs.push("--database-url", databaseUrl);
  }
  run(process.execPath, scaffoldArgs, workdir, nodeEnv);

  const envExample = readFileSync(join(project, ".env.example"), "utf8");
  const requiredEnv = envExample.includes("BETTER_AUTH_SECRET")
    ? [
        "DATABASE_URL",
        "BETTER_AUTH_URL",
        "ALLOW_SIGNUP",
        "REQUIRE_EMAIL_VERIFICATION",
        "RESEND_API_KEY",
      ]
    : ["DATABASE_URL"];
  for (const key of requiredEnv) {
    if (!envExample.includes(key)) {
      throw new Error(`.env.example is missing ${key}`);
    }
  }

  // SQLite: the Prisma CLI migrated the file the app adapter seeded. Open it
  // directly to prove both resolved the same `prisma/dev.db`.
  if (database === "sqlite") {
    const check = join(project, "dashild-sqlite-check.cjs");
    writeFileSync(
      check,
      `const Database = require("better-sqlite3");
const db = new Database("prisma/dev.db", { readonly: true });
const tables = db
  .prepare("select name from sqlite_master where type = 'table'")
  .all()
  .map((row) => row.name);
const users = db.prepare('select count(*) as count from "User"').get().count;
db.close();
if (!tables.includes("User") || !users) {
  console.error("sqlite: prisma/dev.db has no seeded User rows", tables);
  process.exit(1);
}
console.log(
  "sqlite: " + users + " users in prisma/dev.db (" + tables.length + " tables)",
);
`,
      "utf8",
    );
    run(process.execPath, [check], project, nodeEnv);
    rmSync(check, { force: true });
  }

  const build =
    packageManager === "pnpm"
      ? { command: "pnpm", args: ["build"] }
      : { command: "npm", args: ["run", "build"] };
  run(build.command, build.args, project, nodeEnv);

  console.log(
    `\nScaffold smoke passed: ${template} / ${packageManager} / ${database}`,
  );
  rmSync(workdir, { recursive: true, force: true });
} catch (error) {
  console.error(
    `\nScaffold smoke failed: ${error instanceof Error ? error.message : error}`,
  );
  console.error(`Generated app kept at ${project}`);
  process.exitCode = 1;
}
