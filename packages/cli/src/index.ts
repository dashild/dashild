#!/usr/bin/env node
/**
 * Dashild CLI.
 *
 * The commands cover the install lifecycle: init, make:resource, doctor,
 * ui:add and eject.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import type { Locale } from "@dashild/core";
import { Command } from "commander";

import { formatDoctor, runDoctor } from "./doctor.js";
import { eject } from "./eject.js";
import { generateResourceFile } from "./generate.js";
import { makeAction } from "./make-action.js";
import { applyInit, formatInitPlan, planInit } from "./init.js";
import { cliMessage, resolveCliLocale } from "./messages.js";
import { findMetadata, readMetadata } from "./metadata.js";
import { resourceExportName, resourceFileName } from "./naming.js";
import { registerResource } from "./register.js";
import { formatUiRegistration, uiAdd, UI_TEMPLATES } from "./ui-add.js";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

interface MakeResourceOptions {
  cwd: string;
  metadata?: string;
  dir: string;
  dryRun?: boolean;
  register?: boolean;
}

const program = new Command();

program
  .name("dashild")
  .description("The application admin layer for Next.js")
  .version(pkg.version)
  .option(
    "--lang <locale>",
    "output language: en or es",
    process.env.DASHILD_LANG,
  );

/** Resolved after `parse()`, so `--lang` and `DASHILD_LANG` are respected. */
const locale = (): Locale => resolveCliLocale(program.opts().lang);

program
  .command("make:resource <model>")
  .description("Write a resource file to src/dashild/resources/")
  .option("--cwd <dir>", "project root", process.cwd())
  .option("--metadata <path>", "path to dashild-metadata.json")
  .option("--dir <path>", "resources folder", "src/dashild/resources")
  .option(
    "--no-register",
    "do not add the resource to panel.ts and policies.ts",
  )
  .option("--dry-run", "print the file without writing it")
  .action((model: string, options: MakeResourceOptions) => {
    try {
      const activeLocale = locale();
      const cwd = resolve(options.cwd);
      const metadataPath = findMetadata(cwd, options.metadata, activeLocale);
      const metadata = readMetadata(metadataPath, activeLocale);

      const directory = resolve(cwd, options.dir);
      const target = resolve(directory, resourceFileName(model));

      const registerExisting = () => {
        const result = registerResource({
          panelPath: resolve(dirname(directory), "panel.ts"),
          policiesPath: resolve(dirname(directory), "policies.ts"),
          resourceFile: target,
          exportName: resourceExportName(model),
          model,
        });

        if (result.panelUpdated || result.policiesUpdated) {
          console.log(
            cliMessage(activeLocale, "resource.registered", { model }),
          );
        }

        for (const warning of result.warnings) {
          console.log(`dashild: ${warning}`);
        }
      };

      // Write-once: the resource belongs to the developer. Never regenerate.
      if (existsSync(target)) {
        console.log(
          cliMessage(activeLocale, "resource.exists", {
            path: relative(cwd, target),
          }),
        );
        if (options.register !== false && options.dryRun !== true) {
          registerExisting();
        }
        return;
      }

      const content = generateResourceFile(metadata, model, activeLocale);

      if (options.dryRun) {
        process.stdout.write(content);
        return;
      }

      mkdirSync(directory, { recursive: true });
      writeFileSync(target, content, "utf8");
      console.log(
        cliMessage(activeLocale, "resource.created", {
          path: relative(cwd, target),
        }),
      );

      if (options.register === false) {
        console.log(
          cliMessage(activeLocale, "resource.registerSkipped"),
        );
        return;
      }

      registerExisting();
    } catch (error) {
      console.error(
        `dashild: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    }
  });

program
  .command("make:action <model> <action>")
  .description("Append a handler stub to src/dashild/actions/index.ts")
  .option("--cwd <dir>", "project root", process.cwd())
  .option("--dir <path>", "actions folder", "src/dashild/actions")
  .action(
    (
      model: string,
      action: string,
      options: { cwd: string; dir: string },
    ) => {
      try {
        const cwd = resolve(options.cwd);
        const result = makeAction({
          cwd,
          dir: options.dir,
          model,
          action,
        });
        console.log(
          result.created
            ? `Added ${model}.${action} to ${relative(cwd, result.path)}`
            : `${model}.${action} is already registered in ${relative(cwd, result.path)}`,
        );
        console.log(
          "Declare the action in the resource (table.actions or form.actions); the resource stays write-once.",
        );
      } catch (error) {
        console.error(
          `dashild: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exitCode = 1;
      }
    },
  );

program
  .command("init")
  .description("Add Dashild to an existing Next.js app")
  .option("--cwd <dir>", "project root", process.cwd())
  .option("--metadata <path>", "path to dashild-metadata.json")
  .option("--path <route>", "mount route (default: /admin)")
  .option("--auth <provider>", "auth integration: none or better-auth", "none")
  .option("--yes", "write the files")
  .option("--force", "overwrite the generated files")
  .option("--dry-run", "print the plan without writing")
  .action(
    (options: {
      cwd: string;
      metadata?: string;
      path?: string;
      auth?: string;
      yes?: boolean;
      force?: boolean;
      dryRun?: boolean;
    }) => {
      try {
        const activeLocale = locale();
        const plan = planInit({
          cwd: resolve(options.cwd),
          metadata: options.metadata,
          path: options.path,
          auth: options.auth,
          locale: activeLocale,
          force: options.force,
        });

        console.log(formatInitPlan(plan, activeLocale));

        if (options.dryRun || !options.yes) {
          console.log(`\n${cliMessage(activeLocale, "init.applyHint")}`);
          return;
        }

        applyInit(plan);
        for (const file of plan.files) {
          console.log(
            cliMessage(activeLocale, "init.written", {
              path: relative(plan.cwd, file.path),
            }),
          );
        }
        if (plan.scriptAdded) {
          console.log(cliMessage(activeLocale, "init.script"));
        }
        const doneKey =
          plan.authProvider === "better-auth"
            ? "init.done.better-auth"
            : "init.done";
        console.log(
          `\n${cliMessage(activeLocale, doneKey, {
            panel: relative(plan.cwd, resolve(plan.cwd, "src/dashild/panel.ts")),
          })}`,
        );
      } catch (error) {
        console.error(
          `dashild: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exitCode = 1;
      }
    },
  );

program
  .command("doctor")
  .description("Check resource files against Prisma metadata")
  .option("--cwd <dir>", "project root", process.cwd())
  .option("--metadata <path>", "path to dashild-metadata.json")
  .option("--dir <path>", "resources folder", "src/dashild/resources")
  .option("--policies <path>", "path to policies.ts")
  .option("--actions <path>", "path to actions/index.ts")
  .option("--json", "print a machine-readable report")
  .action(
    (options: {
      cwd: string;
      metadata?: string;
      dir: string;
      policies?: string;
      actions?: string;
      json?: boolean;
    }) => {
      try {
        const report = runDoctor({
          cwd: resolve(options.cwd),
          metadata: options.metadata,
          dir: options.dir,
          policies: options.policies,
          actions: options.actions,
          locale: locale(),
        });

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(formatDoctor(report));
        }

        if (!report.ok) process.exitCode = 1;
      } catch (error) {
        console.error(
          `dashild: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exitCode = 1;
      }
    },
  );

program
  .command("ui:add <components...>")
  .description("Copy a cell or field template into the project")
  .option("--cwd <dir>", "project root", process.cwd())
  .option("--dir <path>", "components folder", "components/dashild")
  .option("--force", "overwrite an existing file")
  .option("--dry-run", "show the files without writing")
  .action(
    (
      components: string[],
      options: {
        cwd: string;
        dir: string;
        force?: boolean;
        dryRun?: boolean;
      },
    ) => {
      const result = uiAdd({
        cwd: resolve(options.cwd),
        dir: options.dir,
        names: components,
        force: options.force,
        dryRun: options.dryRun,
      });

      for (const path of result.created) {
        console.log(`${options.dryRun ? "Would create" : "Created"} ${path}`);
      }
      for (const path of result.skipped) {
        console.log(`${path} already exists; use --force to overwrite.`);
      }
      for (const name of result.unknown) {
        console.log(
          `Unknown component "${name}". Available: ${Object.keys(
            UI_TEMPLATES,
          ).join(", ")}.`,
        );
      }

      for (const name of components) {
        if (result.created.length > 0 || result.skipped.length > 0) {
          console.log(formatUiRegistration(name));
        }
      }
    },
  );

program
  .command("eject")
  .description("Remove the files written by dashild init")
  .option("--cwd <dir>", "project root", process.cwd())
  .option("--path <route>", "panel route when it cannot be read from panel.ts")
  .option("--yes", "apply the removal")
  .option("--dry-run", "show the files without removing them")
  .action(
    (options: {
      cwd: string;
      path?: string;
      yes?: boolean;
      dryRun?: boolean;
    }) => {
      const result = eject({
        cwd: resolve(options.cwd),
        path: options.path,
        yes: options.yes,
        dryRun: options.dryRun,
      });

      const verb = result.applied ? "Removed" : "Would remove";
      for (const file of result.removed) console.log(`${verb} ${file}`);
      if (result.removed.length === 0) {
        console.log("Nothing from dashild init was found.");
      }

      if (result.kept.length > 0) {
        console.log("\nKept (app-owned):");
        for (const file of result.kept) console.log(`  ${file}`);
        console.log(
          "\nRemove @dashild/* dependencies and the dashild Prisma generator by hand if you no longer need them.",
        );
      }

      if (!result.applied) {
        console.log("\nNothing was removed. Re-run with --yes to apply.");
      }
    },
  );

program.parse();
