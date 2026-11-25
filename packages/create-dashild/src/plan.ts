import { relative } from "node:path";

import { scriptCommand } from "./commands.js";
import { t } from "./messages.js";
import type { CreateOptions, CreateResult, Locale } from "./types.js";

function projectRelative(path: string): string {
  return relative(process.cwd(), path) || ".";
}

function yesNo(value: boolean, locale: Locale): string {
  return value ? t(locale, "planYes") : t(locale, "planNo");
}

export function formatPlan(
  options: CreateOptions,
  source: string,
  locale: Locale,
): string[] {
  return [
    `${t(locale, "planProject")}: ${options.name} (${projectRelative(options.dir)})`,
    `${t(locale, "planStarter")}: ${options.template} (${source})`,
    `${t(locale, "planAuth")}: ${options.auth}`,
    `${t(locale, "planDatabase")}: ${
      options.databaseUrl
        ? options.database
        : `${options.database} (${t(locale, "databaseUrl")} pending)`
    }`,
    `${t(locale, "planPanel")}: ${options.panelPath}`,
    `${t(locale, "planInstall")}: ${yesNo(options.install, locale)} (${
      options.packageManager
    })`,
    `${t(locale, "planMigrate")}: ${
      options.databaseUrl ? yesNo(options.migrate, locale) : t(locale, "planSkip")
    }`,
    `${t(locale, "planSeed")}: ${yesNo(options.seed, locale)}`,
    `${t(locale, "planGit")}: ${yesNo(options.git, locale)}`,
  ];
}

export function formatNextSteps(
  options: CreateOptions,
  result: CreateResult,
  locale: Locale,
): string[] {
  const lines = [t(locale, "cd", { dir: projectRelative(result.projectDir) })];

  for (const command of result.pending) {
    lines.push(command);
  }

  lines.push(
    scriptCommand(options.packageManager, "dev"),
    t(locale, "panel", { path: options.panelPath }),
  );

  if (result.hasSeed) {
    lines.push(t(locale, "login"));
  }

  if (options.auth === "none") {
    lines.push(t(locale, "connectAuth"));
  }

  lines.push(t(locale, "docs"));
  return lines;
}
