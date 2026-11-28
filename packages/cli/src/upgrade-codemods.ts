import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface CodemodOptions {
  cwd: string;
  panelPath: string;
  target: string;
  dryRun?: boolean;
}

export interface CodemodResult {
  applied: string[];
  files: string[];
}

const CODEMOD_VERSION = "0.1.0-alpha.12";

function compareVersions(left: string, right: string): number {
  const parse = (value: string) => {
    const match = value.match(
      /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z]+)\.(\d+))?$/,
    );
    if (!match) return null;
    return {
      numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
      pre: match[4] ?? null,
      preNumber: match[5] ? Number(match[5]) : null,
    };
  };

  const a = parse(left);
  const b = parse(right);
  if (!a || !b) return left.localeCompare(right);

  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index]) {
      return (a.numbers[index] ?? 0) - (b.numbers[index] ?? 0);
    }
  }
  if (a.pre === b.pre) {
    return (a.preNumber ?? 0) - (b.preNumber ?? 0);
  }
  if (a.pre === null) return 1;
  if (b.pre === null) return -1;
  return a.pre.localeCompare(b.pre);
}

function markerVersion(content: string): string | null {
  return content.match(/\/\/ dashild:generated (\S+)/)?.[1] ?? null;
}

function withMarker(content: string, target: string): string {
  const marker = `// dashild:generated ${target}`;
  if (/\/\/ dashild:generated \S+/.test(content)) {
    return content.replace(/\/\/ dashild:generated \S+/, marker);
  }
  if (content.startsWith('"use client";')) {
    return content.replace('"use client";', `"use client";\n\n${marker}`);
  }
  if (content.startsWith('"use server";')) {
    return content.replace('"use server";', `"use server";\n\n${marker}`);
  }
  return `${marker}\n${content}`;
}

function addServerActions(content: string): string | null {
  if (content.includes("export async function exportResource")) return null;

  const types = content.replace(
    "  RuntimeActionResult,\n  RuntimeSaveResult,",
    "  RuntimeActionResult,\n  RuntimeExportResult,\n  RuntimeImportResult,\n  RuntimeSaveResult,",
  );
  if (types === content) return null;

  const functions = `export async function exportResource(input: {
  slug: string;
  params?: Record<string, string | string[] | undefined>;
}): Promise<RuntimeExportResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  const resource = panel.resources.find(
    (entry) => entry.navigation.slug === input.slug,
  );
  if (!resource) {
    return {
      ok: false,
      message: translate(panel.locale, "error.resourceNotFound"),
    };
  }

  return runtime.exportCsv(resource, input.params ?? {}, user);
}

export async function importResource(input: {
  slug: string;
  csv: string;
}): Promise<RuntimeImportResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  const resource = panel.resources.find(
    (entry) => entry.navigation.slug === input.slug,
  );
  if (!resource) {
    return {
      ok: false,
      message: translate(panel.locale, "error.resourceNotFound"),
    };
  }

  return runtime.importCsv(resource, input.csv, user);
}

`;

  const anchor = "export async function saveResource(input: {";
  if (!types.includes(anchor)) return null;
  return types.replace(anchor, `${functions}${anchor}`);
}

function addRouteProps(content: string): string | null {
  if (content.includes("exportAction={exportResource}")) return null;

  let next = content;
  if (!next.includes("exportResource,")) {
    next = next.replace(
      "  deleteResource,\n",
      "  deleteResource,\n  exportResource,\n  importResource,\n",
    );
  }

  const themeLine = next.match(/^([ \t]*)themeAction=\{toggleTheme\}\n/m);
  if (themeLine) {
    const indent = themeLine[1] ?? "";
    next = next.replace(
      themeLine[0],
      `${themeLine[0]}${indent}exportAction={exportResource}\n${indent}importAction={importResource}\n`,
    );
    return next;
  }

  const toggleLine = next.match(/^([ \t]*)themeToggle=[^\n]*\n/m);
  if (toggleLine) {
    const indent = toggleLine[1] ?? "";
    next = next.replace(
      toggleLine[0],
      `${toggleLine[0]}${indent}exportAction={exportResource}\n${indent}importAction={importResource}\n`,
    );
    return next;
  }

  return null;
}

/**
 * Safe glue codemods for known generated shapes.
 *
 * Only the exact text written by `dashild init` is patched; anything that does
 * not match is left alone and reported by the upgrade drift list.
 */
export function applyUpgradeCodemods(options: CodemodOptions): CodemodResult {
  if (compareVersions(options.target, CODEMOD_VERSION) < 0) {
    return { applied: [], files: [] };
  }

  const applied: string[] = [];
  const files: string[] = [];
  const write = (path: string, content: string, original: string) => {
    if (content === original) return false;
    files.push(path.slice(options.cwd.length + 1).replace(/\\/g, "/"));
    if (!options.dryRun) writeFileSync(path, content, "utf8");
    return true;
  };

  const serverPath = resolve(options.cwd, "src/dashild/server.ts");
  if (existsSync(serverPath)) {
    const original = readFileSync(serverPath, "utf8");
    const version = markerVersion(original);
    const outdated =
      version === null || compareVersions(version, CODEMOD_VERSION) < 0;

    if (outdated) {
      const patched = addServerActions(original);
      if (patched) {
        const marked = withMarker(patched, options.target);
        if (write(serverPath, marked, original)) {
          applied.push("csv-export-import");
        }
      }
    }
  }

  const routeCandidates = [
    resolve(options.cwd, `src/app${options.panelPath}/[[...dashild]]/page.tsx`),
    resolve(options.cwd, `app${options.panelPath}/[[...dashild]]/page.tsx`),
  ];

  for (const routePath of routeCandidates) {
    if (!existsSync(routePath)) continue;
    const original = readFileSync(routePath, "utf8");
    const version = markerVersion(original);
    const outdated =
      version === null || compareVersions(version, CODEMOD_VERSION) < 0;
    if (!outdated) continue;

    const patched = addRouteProps(original);
    if (patched) {
      const marked = withMarker(patched, options.target);
      if (write(routePath, marked, original)) {
        applied.push("csv-export-import");
      }
    }
    break;
  }

  return { applied: [...new Set(applied)], files };
}
