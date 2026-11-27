import {
  existsSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

export interface EjectOptions {
  cwd: string;
  /** Panel route when it cannot be read from panel.ts. */
  path?: string;
  /** Apply the removal. Without it the command only prints the plan. */
  yes?: boolean;
  dryRun?: boolean;
}

export interface EjectResult {
  removed: string[];
  kept: string[];
  applied: boolean;
}

const PANEL_FILES = [
  "panel.ts",
  "policies.ts",
  "actions/index.ts",
  "icons.tsx",
  "runtime.ts",
  "server.ts",
  "registry.tsx",
  "organization-actions.ts",
];

const AUTH_FILES = [
  "src/lib/auth.ts",
  "src/lib/auth-client.ts",
  "src/lib/session.ts",
  "src/lib/auth-actions.ts",
  "src/app/api/auth/[...all]/route.ts",
  "src/app/login/page.tsx",
  "src/app/signup/page.tsx",
  "src/components/dashild/login-form.tsx",
  "src/components/dashild/signup-form.tsx",
];

function appDirectory(cwd: string): string {
  const src = resolve(cwd, "src/app");
  return existsSync(src) ? src : resolve(cwd, "app");
}

function panelRoute(cwd: string, override?: string): string {
  if (override) return `/${override.replace(/^\/+|\/+$/g, "") || "admin"}`;

  const panel = resolve(cwd, "src/dashild/panel.ts");
  if (existsSync(panel)) {
    const match = readFileSync(panel, "utf8").match(
      /path:\s*["'`]([^"'`]+)["'`]/,
    );
    if (match?.[1]) {
      return match[1].startsWith("/") ? match[1] : `/${match[1]}`;
    }
  }

  return "/admin";
}

function removeIfEmpty(directory: string): void {
  try {
    if (existsSync(directory) && readdirSync(directory).length === 0) {
      rmdirSync(directory);
    }
  } catch {
    // A non-empty or locked directory stays; eject never forces it.
  }
}

function hasDashildGenerator(cwd: string): boolean {
  for (const candidate of ["prisma/schema.prisma", "schema.prisma"]) {
    const path = resolve(cwd, candidate);
    if (!existsSync(path)) continue;
    if (/generator\s+dashild\s*\{/.test(readFileSync(path, "utf8"))) {
      return true;
    }
  }
  return false;
}

/**
 * Removes the panel files written by `dashild init`.
 *
 * Auth files, resources and the Prisma generator are app-owned: they stay and
 * are listed in `kept`.
 */
export function eject(options: EjectOptions): EjectResult {
  const cwd = resolve(options.cwd);
  const route = panelRoute(cwd, options.path);
  const appDir = appDirectory(cwd);
  const dashildDir = resolve(cwd, "src/dashild");
  const routeDir = resolve(appDir, route.replace(/^\//, ""));
  const applied = Boolean(options.yes) && !options.dryRun;

  const targets = [
    ...PANEL_FILES.map((file) => resolve(dashildDir, file)),
    resolve(routeDir, "[[...dashild]]/page.tsx"),
  ];

  const removed: string[] = [];
  for (const target of targets) {
    if (!existsSync(target)) continue;
    removed.push(relative(cwd, target));
    if (applied) rmSync(target, { force: true });
  }

  const packageJsonPath = resolve(cwd, "package.json");
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    if (packageJson.scripts?.dashild === "dashild") {
      removed.push("package.json (dashild script)");
      if (applied) {
        delete packageJson.scripts.dashild;
        writeFileSync(
          packageJsonPath,
          `${JSON.stringify(packageJson, null, 2)}\n`,
          "utf8",
        );
      }
    }
  }

  if (applied) {
    removeIfEmpty(resolve(dashildDir, "actions"));
    removeIfEmpty(resolve(routeDir, "[[...dashild]]"));
    removeIfEmpty(routeDir);
    removeIfEmpty(dashildDir);
  }

  const kept: string[] = [];
  const resourcesDir = resolve(dashildDir, "resources");
  if (existsSync(resourcesDir)) {
    for (const file of readdirSync(resourcesDir)) {
      if (file.endsWith(".ts")) kept.push(`src/dashild/resources/${file}`);
    }
  }
  for (const file of AUTH_FILES) {
    if (existsSync(resolve(cwd, file))) kept.push(file);
  }
  if (hasDashildGenerator(cwd)) kept.push("prisma/schema.prisma (generator dashild)");

  return { removed, kept, applied };
}
