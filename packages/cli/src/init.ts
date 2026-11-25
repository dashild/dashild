/**
 * `dashild init`: add the panel to an existing Next.js app.
 *
 * It writes only app glue: the panel config, a fail-closed policy file, the
 * action registry, the app's runtime wiring and the mount route. It never
 * touches middleware/proxy, the root layout, next.config or the auth files.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

import type { Locale } from "@dashild/core";

import { cliMessage } from "./messages.js";
import { findMetadata, readMetadata } from "./metadata.js";

export interface InitOptions {
  cwd: string;
  metadata?: string;
  path?: string;
  locale?: Locale;
  force?: boolean;
}

export interface InitFile {
  path: string;
  content: string;
}

export interface InitPlan {
  cwd: string;
  appDir: string;
  panelPath: string;
  files: InitFile[];
  packageJsonPath: string;
  packageJson: string;
  scriptAdded: boolean;
  warnings: string[];
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function importPath(from: string, to: string): string {
  const path = relative(dirname(from), to)
    .replace(/\\/g, "/")
    .replace(/\.(tsx?|jsx?)$/, "");
  return path.startsWith(".") ? path : `./${path}`;
}

function normalizeRoute(value: string): string {
  const cleaned = value.replace(/^\/+|\/+$/g, "");
  return `/${cleaned}`;
}

function routeDirectory(value: string): string {
  return value.replace(/^\/+/, "");
}

function appDirectory(cwd: string): string {
  const src = resolve(cwd, "src/app");
  if (existsSync(src)) return src;
  const app = resolve(cwd, "app");
  if (existsSync(app)) return app;
  return src;
}

function chooseRoute(
  cwd: string,
  appDir: string,
  requested: string | undefined,
  locale: Locale,
  warnings: string[],
): string {
  if (requested) {
    const route = normalizeRoute(requested);
    const page = resolve(appDir, routeDirectory(route), "page.tsx");
    if (existsSync(page)) {
      throw new Error(
        cliMessage(locale, "init.exists", {
          path: relative(cwd, page),
        }),
      );
    }
    return route;
  }

  const candidates = ["admin", "panel", "admin-panel", "dashild"];
  for (const candidate of candidates) {
    const page = resolve(appDir, candidate, "page.tsx");
    if (!existsSync(page)) {
      if (candidate !== "admin") {
        warnings.push(
          cliMessage(locale, "init.routeConflict", {
            path: relative(cwd, resolve(appDir, "admin", "page.tsx")),
            route: candidate,
          }),
        );
      }
      return `/${candidate}`;
    }
  }

  throw new Error(
    cliMessage(locale, "init.exists", {
      path: relative(cwd, resolve(appDir, "admin/page.tsx")),
    }),
  );
}

function prismaModule(cwd: string): { path: string; found: boolean } {
  const candidates = [
    "src/lib/prisma.ts",
    "src/lib/prisma.tsx",
    "lib/prisma.ts",
    "lib/prisma.tsx",
    "src/lib/db.ts",
    "src/db.ts",
    "lib/db.ts",
    "src/prisma.ts",
    "prisma.ts",
  ];

  for (const candidate of candidates) {
    const full = resolve(cwd, candidate);
    if (existsSync(full)) return { path: full, found: true };
  }

  return { path: resolve(cwd, "src/lib/prisma.ts"), found: false };
}

function panelFile(panelPath: string): string {
  return `import { definePanel, type CurrentUser } from "@dashild/core";

/**
 * Panel configuration.
 *
 * Dashild never touches your auth files. Complete this adapter: return the
 * signed-in user or null. Organization fields are optional; add them when the
 * app has organizations.
 */
async function getCurrentUser(): Promise<CurrentUser | null> {
  // TODO: replace with your authentication adapter.
  return null;
}

export const panel = definePanel({
  title: "Admin",
  path: ${quote(panelPath)},
  locale: "en",
  resources: [],
  auth: {
    getCurrentUser,
  },
});
`;
}

function policiesFile(): string {
  return `import { definePolicies, type CurrentUser } from "@dashild/core";

/**
 * Server policies.
 *
 * Fail closed: a resource without an entry here is denied, even if it exists
 * in Prisma. Add one entry per resource, with its scope and permissions.
 */
export const policies = definePolicies<CurrentUser>({
  resources: {},
});
`;
}

function actionsFile(): string {
  return `import type { ActionHandler, CurrentUser } from "@dashild/core";

/**
 * Custom action handlers, keyed by Prisma model and action name.
 *
 * The action itself is declared in the resource (table.actions/form.actions);
 * the handler lives here because it runs on the server.
 */
export const resourceActions: Record<
  string,
  Record<string, ActionHandler<CurrentUser>>
> = {};
`;
}

function iconsFile(): string {
  return `"use client";

import type { ElementType } from "react";

import { IconProvider } from "@dashild/admin";

/**
 * App icon registry.
 *
 * Add any React icon component here under the name used by
 * \`navigation.icon\` or \`action.icon\`.
 */
export const icons: Record<string, ElementType> = {};

export function AppIconProvider({ children }: { children: React.ReactNode }) {
  return <IconProvider icons={icons}>{children}</IconProvider>;
}
`;
}

function runtimeFile(
  metadataPath: string,
  prismaPath: string,
  runtimePath: string,
): string {
  return `import type { DashildMetadata } from "@dashild/core";
import { createDashildRuntime } from "@dashild/core/server";

import metadataJson from ${quote(importPath(runtimePath, metadataPath))};
import { prisma } from ${quote(importPath(runtimePath, prismaPath))};

import { resourceActions } from "./actions";
import { panel } from "./panel";
import { policies } from "./policies";

const metadata = metadataJson as unknown as DashildMetadata;

/**
 * App runtime.
 *
 * The generic query and write logic lives in @dashild/core/server. This file
 * only wires the app's Prisma client, metadata, policies and action handlers.
 */
export const runtime = createDashildRuntime({
  prisma,
  metadata,
  resources: panel.resources,
  policies,
  locale: panel.locale,
  actions: resourceActions,
});
`;
}

function serverFile(): string {
  return `"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { translate } from "@dashild/core";
import type {
  RuntimeActionInput,
  RuntimeActionResult,
  RuntimeSaveResult,
} from "@dashild/core/server";

import { panel } from "./panel";
import { runtime } from "./runtime";

/**
 * Server actions for the panel.
 *
 * The client sends a slug, an id and values; it never sends a where, a policy
 * or an organization scope. The runtime resolves and enforces all of them.
 */

export async function saveResource(input: {
  slug: string;
  id?: string;
  values: Record<string, unknown>;
}): Promise<RuntimeSaveResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  const result = await runtime.save(input, user);
  if (!result.ok) return result;

  revalidatePath(\`\${panel.path}/\${input.slug}\`);
  redirect(\`\${panel.path}/\${input.slug}\`);
}

export async function deleteResource(input: {
  slug: string;
  id: string;
}): Promise<RuntimeSaveResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  const result = await runtime.remove(input, user);
  if (!result.ok) return result;

  revalidatePath(\`\${panel.path}/\${input.slug}\`);
  redirect(\`\${panel.path}/\${input.slug}\`);
}

export async function runResourceAction(
  input: RuntimeActionInput,
): Promise<RuntimeActionResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  return runtime.runAction(input, user);
}
`;
}

function routeFile(
  routePath: string,
  panelModule: string,
  policiesModule: string,
  runtimeModule: string,
  serverModule: string,
  iconsModule: string,
): string {
  return `import { AdminPage } from "@dashild/admin/server";

import { AppIconProvider } from ${quote(importPath(routePath, iconsModule))};
import { panel } from ${quote(importPath(routePath, panelModule))};
import { policies } from ${quote(importPath(routePath, policiesModule))};
import { runtime } from ${quote(importPath(routePath, runtimeModule))};
import {
  deleteResource,
  runResourceAction,
  saveResource,
} from ${quote(importPath(routePath, serverModule))};

/**
 * Dashild mount route.
 *
 * Routing, policy and data loading live in @dashild/admin/server. This file
 * only wires the app's session and server actions.
 */

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DashildPage({
  params,
  searchParams,
}: {
  params: Promise<{ dashild?: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <AdminPage
      panel={panel}
      policies={policies}
      runtime={runtime}
      saveAction={saveResource}
      deleteAction={deleteResource}
      runAction={runResourceAction}
      IconProvider={AppIconProvider}
      params={params}
      searchParams={searchParams}
      theme={panel.theme?.defaultMode ?? "light"}
      themeToggle={panel.theme?.toggle ?? false}
    />
  );
}
`;
}

export function planInit(options: InitOptions): InitPlan {
  const cwd = resolve(options.cwd);
  const locale = options.locale ?? "en";
  const packageJsonPath = resolve(cwd, "package.json");

  if (!existsSync(packageJsonPath)) {
    throw new Error(
      cliMessage(locale, "init.notNext", { path: relative(process.cwd(), cwd) }),
    );
  }

  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  if (
    !packageJson.dependencies?.next &&
    !packageJson.devDependencies?.next
  ) {
    throw new Error(
      cliMessage(locale, "init.notNext", { path: relative(process.cwd(), cwd) }),
    );
  }

  const metadataPath = findMetadata(cwd, options.metadata, locale);
  readMetadata(metadataPath, locale);

  const warnings: string[] = [];
  const installed = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const missing = ["@dashild/admin", "@dashild/core", "@dashild/prisma"].filter(
    (name) => !installed[name],
  );
  if (missing.length > 0) {
    warnings.push(
      cliMessage(locale, "init.warning.deps", {
        packages: missing.join(", "),
      }),
    );
  }
  const appDir = appDirectory(cwd);
  const panelPath = chooseRoute(cwd, appDir, options.path, locale, warnings);

  const dashildDir = resolve(cwd, "src/dashild");
  const runtimePath = resolve(dashildDir, "runtime.ts");
  const prisma = prismaModule(cwd);
  if (!prisma.found) {
    warnings.push(
      cliMessage(locale, "init.warning.prisma", {
        path: relative(cwd, prisma.path),
      }),
    );
  }

  const routePath = resolve(
    appDir,
    routeDirectory(panelPath),
    "[[...dashild]]/page.tsx",
  );

  const files: InitFile[] = [
    {
      path: resolve(dashildDir, "panel.ts"),
      content: panelFile(panelPath),
    },
    {
      path: resolve(dashildDir, "policies.ts"),
      content: policiesFile(),
    },
    {
      path: resolve(dashildDir, "actions/index.ts"),
      content: actionsFile(),
    },
    {
      path: resolve(dashildDir, "icons.tsx"),
      content: iconsFile(),
    },
    {
      path: runtimePath,
      content: runtimeFile(metadataPath, prisma.path, runtimePath),
    },
    {
      path: resolve(dashildDir, "server.ts"),
      content: serverFile(),
    },
    {
      path: routePath,
      content: routeFile(
        routePath,
        resolve(dashildDir, "panel.ts"),
        resolve(dashildDir, "policies.ts"),
        runtimePath,
        resolve(dashildDir, "server.ts"),
        resolve(dashildDir, "icons.tsx"),
      ),
    },
  ];

  if (!options.force) {
    const existing = files.find((file) => existsSync(file.path));
    if (existing) {
      throw new Error(
        cliMessage(locale, "init.exists", {
          path: relative(cwd, existing.path),
        }),
      );
    }
  }

  const scriptAdded = !packageJson.scripts?.dashild;
  if (scriptAdded) {
    packageJson.scripts = {
      ...packageJson.scripts,
      dashild: "dashild",
    };
  }

  return {
    cwd,
    appDir,
    panelPath,
    files,
    packageJsonPath,
    packageJson: `${JSON.stringify(packageJson, null, 2)}\n`,
    scriptAdded,
    warnings,
  };
}

export function applyInit(plan: InitPlan): void {
  for (const file of plan.files) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.content, "utf8");
  }

  writeFileSync(plan.packageJsonPath, plan.packageJson, "utf8");
}

export function formatInitPlan(plan: InitPlan, locale: Locale = "en"): string {
  const lines = ["dashild init", ""];
  lines.push(`Panel: ${plan.panelPath}`);

  for (const warning of plan.warnings) {
    lines.push(`⚠ ${warning}`);
  }

  lines.push("", cliMessage(locale, "init.plan"));

  for (const file of plan.files) {
    lines.push(`  create ${relative(plan.cwd, file.path)}`);
  }

  if (plan.scriptAdded) {
    lines.push(`  update ${relative(plan.cwd, plan.packageJsonPath)}`);
  }

  return lines.join("\n");
}
