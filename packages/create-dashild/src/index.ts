#!/usr/bin/env node
import { relative } from "node:path";

import * as p from "@clack/prompts";
import { Command } from "commander";

import { createProject } from "./create.js";
import { t, resolveLocale } from "./messages.js";
import {
  DATABASES,
  PACKAGE_MANAGERS,
} from "./options.js";
import { formatNextSteps, formatPlan } from "./plan.js";
import {
  CancelledError,
  promptOptions,
  type PromptFlags,
} from "./prompt.js";
import { CREATE_VERSION, DASHILD_VERSION } from "./scaffold.js";
import { loadTemplate, validateTemplate } from "./template.js";
import type {
  AuthProvider,
  CreateOptions,
  CreateStep,
  DatabaseProvider,
  Locale,
  PackageManager,
} from "./types.js";

interface RawOptions {
  name?: string;
  dir?: string;
  template?: string;
  auth?: string;
  database?: string;
  databaseUrl?: string;
  directUrl?: string;
  pm?: string;
  install?: boolean;
  git?: boolean;
  migrate?: boolean;
  seed?: boolean;
  path?: string;
  locale?: string;
  yes?: boolean;
  dryRun?: boolean;
  listTemplates?: boolean;
  tenancy?: boolean;
}

function detectLocale(value: string | undefined): Locale {
  if (value) return resolveLocale(value);
  const fromEnv =
    process.env.DASHILD_LOCALE ?? process.env.LC_ALL ?? process.env.LANG;
  return fromEnv?.toLowerCase().startsWith("es") ? "es" : "en";
}

function stepMessage(locale: Locale, step: CreateStep): string {
  switch (step) {
    case "scaffold":
      return t(locale, "stepScaffold");
    case "files":
      return t(locale, "stepFiles");
    case "template":
      return t(locale, "stepTemplate");
    case "install":
      return t(locale, "stepInstall");
    case "native":
      return t(locale, "stepNative");
    case "migrate":
      return t(locale, "stepMigrate");
    case "seed":
      return t(locale, "stepSeed");
    case "git":
      return t(locale, "stepGit");
  }
}

function invalidOption(
  locale: Locale,
  value: string,
  allowed: readonly string[],
  key: "authInvalid" | "dbInvalid" | "pmInvalid",
): void {
  if (!allowed.includes(value)) {
    throw new Error(t(locale, key));
  }
}

function listTemplates(locale: Locale): void {
  const lines = [
    `basic — ${t(locale, "templateBasic")}`,
    `blog — ${t(locale, "templateBlog")}`,
    `demo — ${t(locale, "templateDemo")}`,
    `saas — ${t(locale, "templateSaas")}`,
    t(locale, "templateLocal"),
    t(locale, "templateGitHub"),
  ];
  p.note(lines.join("\n"), t(locale, "templatesTitle"));
}

const program = new Command();

program
  .name("create-dashild")
  .description("Create a Next.js app with Dashild preconfigured")
  .version(CREATE_VERSION)
  .argument("[name]", "project name and default directory")
  .option("--name <name>", "project name, when the positional is omitted")
  .option("--dir <dir>", "target directory (defaults to the project name)")
  .option("-t, --template <starter>", "basic, demo, local:<path> or github:<owner>/<repo>")
  .option("--auth <provider>", "better-auth or none")
  .option("--database <provider>", "postgresql, mysql or sqlite")
  .option("--database-url <url>", "DATABASE_URL for the new app")
  .option("--direct-url <url>", "DIRECT_URL for migrations behind a pooler")
  .option("--pm <manager>", "pnpm, npm, yarn or bun")
  .option("--no-install", "skip dependency installation")
  .option("--no-git", "skip git init and the first commit")
  .option("--no-migrate", "do not apply the Prisma schema")
  .option("--no-seed", "do not load the starter data")
  .option("--tenancy", "isolate resources by organization (Better Auth)")
  .option("--path <route>", "panel route (defaults to /admin)")
  .option("--locale <locale>", "en or es")
  .option("-y, --yes", "accept the defaults without prompting")
  .option("--dry-run", "print the plan without writing anything")
  .option("--list-templates", "list the bundled starters")
  .action(async (argument: string | undefined) => {
    const raw = program.opts<RawOptions>();
    const locale = detectLocale(raw.locale);

    if (raw.listTemplates) {
      listTemplates(locale);
      return;
    }

    p.intro(t(locale, "intro"));

    try {
      // A negated option defaults to true; only ask about it when the user did
      // not pass it, so `undefined` has to survive commander's default.
      const provided = (key: "install" | "git" | "migrate" | "seed") =>
        program.getOptionValueSource(key) === "cli" ? raw[key] : undefined;

      if (raw.auth) invalidOption(locale, raw.auth, ["better-auth", "none"], "authInvalid");
      if (raw.database) invalidOption(locale, raw.database, DATABASES, "dbInvalid");
      if (raw.pm) invalidOption(locale, raw.pm, PACKAGE_MANAGERS, "pmInvalid");

      const flags: PromptFlags = {
        name: raw.name ?? argument,
        dir: raw.dir,
        template: raw.template,
        auth: raw.auth as AuthProvider | undefined,
        database: raw.database as DatabaseProvider | undefined,
        databaseUrl: raw.databaseUrl,
        directUrl: raw.directUrl,
        packageManager: raw.pm as PackageManager | undefined,
        install: provided("install"),
        git: provided("git"),
        migrate: provided("migrate"),
        seed: provided("seed"),
        panelPath: raw.path,
        locale,
        yes: Boolean(raw.yes),
        tenancy: Boolean(raw.tenancy),
      };

      const options: CreateOptions = await promptOptions(flags);

      if (raw.dryRun) {
        const template = await loadTemplate(options.template, locale);
        validateTemplate(template, {
          auth: options.auth,
          database: options.database,
          dashildVersion: DASHILD_VERSION,
          locale,
          tenancy: options.tenancy,
        });
        p.note(
          formatPlan(options, template.source, locale).join("\n"),
          t(locale, "dryRunTitle"),
        );
        p.outro(t(locale, "dryRunDone"));
        return;
      }

      const result = await createProject(options, (step) => {
        p.log.step(stepMessage(locale, step));
      });

      for (const warning of result.warnings) {
        p.log.warn(warning);
      }

      const dir = relative(process.cwd(), result.projectDir) || ".";
      p.note(
        formatNextSteps(options, result, locale).join("\n"),
        t(locale, "next"),
      );
      p.outro(t(locale, "done", { dir }));
    } catch (error) {
      if (error instanceof CancelledError) {
        p.cancel(t(locale, "cancelled"));
      } else {
        p.cancel(error instanceof Error ? error.message : String(error));
      }
      process.exitCode = 1;
    }
  });

await program.parseAsync(process.argv);
