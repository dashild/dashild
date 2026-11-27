import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { delimiter, dirname, relative, resolve } from "node:path";

import { applyInit, planInit } from "@dashild/cli/init";

import {
  createNextAppCommand,
  execCommand,
  installCommand,
  rebuildCommand,
  runCommand,
  scriptCommand,
} from "./commands.js";
import { t } from "./messages.js";
import { directoryState } from "./options.js";
import {
  addDependencies,
  DASHILD_VERSION,
  finalizePackageJson,
  writeScaffold,
} from "./scaffold.js";
import { applyTemplate, loadTemplate, validateTemplate } from "./template.js";
import type {
  CreateOptions,
  CreateResult,
  CreateStep,
} from "./types.js";

function git(args: string[], cwd: string): Promise<void> {
  return runCommand({ command: "git", args }, { cwd });
}

const SQLITE_NATIVE = "better-sqlite3";

/**
 * Env for a native rebuild: the app's Node must win over any version shim on
 * PATH, otherwise the binding is compiled for a different ABI.
 */
function nativeEnv(): NodeJS.ProcessEnv {
  const nodeDir = dirname(process.execPath);
  return {
    PATH: `${nodeDir}${delimiter}${process.env.PATH ?? ""}`,
    npm_config_target: process.versions.node,
    npm_config_arch: process.arch,
  };
}

async function nativeModuleLoads(
  projectDir: string,
  dependency: string,
): Promise<boolean> {
  const command =
    process.platform === "win32" ? `"${process.execPath}"` : process.execPath;
  // Requiring better-sqlite3 is lazy; constructing a database is what dlopens
  // the binding and surfaces an ABI mismatch.
  const script = `new (require(${JSON.stringify(
    dependency,
  )}))(":memory:").close()`;
  try {
    await runCommand(
      { command, args: ["-e", script] },
      { cwd: projectDir, stdio: "ignore" },
    );
    return true;
  } catch {
    return false;
  }
}

function writeDashildJson(
  options: CreateOptions,
  template: Awaited<ReturnType<typeof loadTemplate>>,
): void {
  const payload = {
    version: 1,
    template: {
      name: template.manifest.name,
      version: template.manifest.version,
      source: template.source,
    },
    auth: options.auth,
    database: options.database,
    panelPath: options.panelPath,
    createdAt: new Date().toISOString(),
  };

  writeFileSync(
    resolve(options.dir, "dashild.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

export async function createProject(
  options: CreateOptions,
  onStep?: (step: CreateStep) => void,
): Promise<CreateResult> {
  const template = await loadTemplate(options.template, options.locale);
  validateTemplate(template, {
    auth: options.auth,
    database: options.database,
    dashildVersion: DASHILD_VERSION,
    locale: options.locale,
    tenancy: options.tenancy,
  });

  const state = directoryState(options.dir);
  if (state === "occupied") {
    throw new Error(
      t(options.locale, "targetExists", {
        dir: relative(process.cwd(), options.dir) || options.dir,
      }),
    );
  }

  mkdirSync(dirname(options.dir), { recursive: true });
  onStep?.("scaffold");
  await runCommand(createNextAppCommand(options.packageManager, options.dir), {
    cwd: process.cwd(),
  });

  onStep?.("files");
  writeScaffold(options);

  const packageJsonPath = resolve(options.dir, "package.json");
  addDependencies(packageJsonPath, options);

  const plan = planInit({
    cwd: options.dir,
    auth: options.auth,
    path: options.panelPath,
    locale: options.locale,
    metadataPath: "src/generated/dashild/dashild-metadata.json",
    schemaPath: "prisma/schema.prisma",
    tenancy: options.tenancy,
  });
  applyInit(plan);

  onStep?.("template");
  const applied = applyTemplate({
    projectDir: options.dir,
    template,
    auth: options.auth,
    database: options.database,
    schemaPath: resolve(options.dir, "prisma/schema.prisma"),
    panelFile: resolve(options.dir, "src/dashild/panel.ts"),
    policiesFile: resolve(options.dir, "src/dashild/policies.ts"),
    libDir: resolve(options.dir, "src/lib"),
    packageJsonPath,
    locale: options.locale,
  });

  finalizePackageJson(packageJsonPath, applied.hasSeed);
  writeDashildJson(options, template);

  const warnings = [...plan.warnings, ...applied.warnings];
  const pending: string[] = [];

  if (!options.databaseUrl) {
    warnings.push(t(options.locale, "databasePending"));
  }

  onStep?.("install");
  let installed = false;
  if (!options.install) {
    pending.push(`${options.packageManager} install`);
  } else {
    try {
      await runCommand(installCommand(options.packageManager), {
        cwd: options.dir,
        // Native install scripts must target the Node that runs the app.
        // Otherwise a version shim can build the wrong ABI (and pnpm has no
        // bundled node-gyp to fall back to).
        env: nativeEnv(),
      });
      installed = true;
    } catch (error) {
      warnings.push(
        `Dependency installation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      pending.push(`${options.packageManager} install`);
    }
  }

  if (installed && options.database === "sqlite") {
    onStep?.("native");
    if (!(await nativeModuleLoads(options.dir, SQLITE_NATIVE))) {
      const rebuild = rebuildCommand(options.packageManager, SQLITE_NATIVE);
      let repaired = false;
      try {
        await runCommand(rebuild, { cwd: options.dir, env: nativeEnv() });
        repaired = await nativeModuleLoads(options.dir, SQLITE_NATIVE);
      } catch {
        repaired = false;
      }
      if (!repaired) {
        const command = [rebuild.command, ...rebuild.args]
          .filter((part) => !part.startsWith("--"))
          .join(" ");
        warnings.push(
          t(options.locale, "sqliteNativeWarning", {
            version: process.versions.node,
            command,
          }),
        );
      }
    }
  }

  const migrateCommand = scriptCommand(options.packageManager, "db:migrate");
  let migrated = false;
  if (options.databaseUrl && options.migrate && installed) {
    onStep?.("migrate");
    try {
      await runCommand(
        execCommand(options.packageManager, "prisma", [
          "migrate",
          "dev",
          "--name",
          "init",
        ]),
        {
          cwd: options.dir,
          // dotenv never overrides an exported variable: keep the generated
          // .env authoritative even if the shell has another DATABASE_URL.
          env: { DATABASE_URL: options.databaseUrl },
        },
      );
      migrated = true;
    } catch (error) {
      warnings.push(
        `Prisma migration failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      pending.push(migrateCommand);
    }
  } else {
    pending.push(migrateCommand);
  }

  let seeded = false;
  if (applied.hasSeed) {
    if (options.seed && migrated) {
      onStep?.("seed");
      try {
        await runCommand(
          execCommand(options.packageManager, "tsx", ["prisma/seed.ts"]),
          { cwd: options.dir, env: { DATABASE_URL: options.databaseUrl } },
        );
        seeded = true;
      } catch (error) {
        warnings.push(
          `Seed failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        pending.push(scriptCommand(options.packageManager, "db:seed"));
      }
    } else {
      pending.push(scriptCommand(options.packageManager, "db:seed"));
    }
  }

  if (options.git) {
    onStep?.("git");
    try {
      if (!existsSync(resolve(options.dir, ".git"))) {
        await git(["init"], options.dir);
      }
      await git(["add", "-A"], options.dir);
      await git(["commit", "-m", "Initial commit"], options.dir);
    } catch (error) {
      warnings.push(
        `Git initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return {
    projectDir: options.dir,
    template: template.manifest.name,
    warnings,
    pending,
    hasSeed: applied.hasSeed,
    seeded,
  };
}
