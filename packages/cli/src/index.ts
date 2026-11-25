#!/usr/bin/env node
/**
 * Dashild CLI.
 *
 * `make:resource` is the first real command. The others stay visible so the
 * roadmap is discoverable, but they explicitly say they are not implemented.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import type { Locale } from "@dashild/core";
import { Command } from "commander";

import { formatDoctor, runDoctor } from "./doctor.js";
import { generateResourceFile } from "./generate.js";
import { applyInit, formatInitPlan, planInit } from "./init.js";
import { cliMessage, resolveCliLocale } from "./messages.js";
import { findMetadata, readMetadata } from "./metadata.js";
import { resourceFileName } from "./naming.js";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

interface MakeResourceOptions {
  cwd: string;
  metadata?: string;
  dir: string;
  dryRun?: boolean;
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
  .option("--dry-run", "print the file without writing it")
  .action((model: string, options: MakeResourceOptions) => {
    try {
      const activeLocale = locale();
      const cwd = resolve(options.cwd);
      const metadataPath = findMetadata(cwd, options.metadata, activeLocale);
      const metadata = readMetadata(metadataPath, activeLocale);

      const directory = resolve(cwd, options.dir);
      const target = resolve(directory, resourceFileName(model));

      // Write-once: the resource belongs to the developer. Never regenerate.
      if (existsSync(target)) {
        console.log(
          cliMessage(activeLocale, "resource.exists", {
            path: relative(cwd, target),
          }),
        );
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
    } catch (error) {
      console.error(
        `dashild: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    }
  });

function pending(name: string, block: string) {
  console.error(
    `dashild: ${cliMessage(locale(), "command.pending", { name, block })}`,
  );
  process.exitCode = 1;
}

program
  .command("init")
  .description("Add Dashild to an existing Next.js app")
  .option("--cwd <dir>", "project root", process.cwd())
  .option("--metadata <path>", "path to dashild-metadata.json")
  .option("--path <route>", "mount route (default: /admin)")
  .option("--yes", "write the files")
  .option("--force", "overwrite the generated files")
  .option("--dry-run", "print the plan without writing")
  .action(
    (options: {
      cwd: string;
      metadata?: string;
      path?: string;
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
        console.log(
          `\n${cliMessage(activeLocale, "init.done", {
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
  .option("--json", "print a machine-readable report")
  .action(
    (options: {
      cwd: string;
      metadata?: string;
      dir: string;
      json?: boolean;
    }) => {
      try {
        const report = runDoctor({
          cwd: resolve(options.cwd),
          metadata: options.metadata,
          dir: options.dir,
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
  .command("ui:add <fields...>")
  .description("Copy field components into the project")
  .action(() => pending("ui:add", "phase 2"));

program
  .command("eject")
  .description("Remove what init wrote")
  .action(() => pending("eject", "phase 2"));

program.parse();
