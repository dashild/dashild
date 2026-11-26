import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import type {
  AuthProvider,
  CreateOptions,
  DatabaseProvider,
  PackageManager,
} from "./types.js";

const PRISMA_VERSION = "7.10.1";
const BETTER_AUTH_VERSION = "^1.7.27";

function readPackage(): {
  version?: string;
  dashildPackages?: string;
} {
  for (const candidate of ["../package.json", "../../package.json"]) {
    try {
      const parsed = JSON.parse(
        readFileSync(new URL(candidate, import.meta.url), "utf8"),
      ) as { version?: string; dashildPackages?: string };
      if (parsed.version) return parsed;
    } catch {
      // Try the next location (source tree vs dist-test).
    }
  }
  return {};
}

const packageInfo = readPackage();

/** This CLI's own version, shown by `--version`. */
export const CREATE_VERSION = packageInfo.version ?? "0.0.0";

/**
 * Version of the `@dashild/*` packages generated apps install.
 *
 * It is separate from the CLI version so a scaffolder fix can ship without
 * republishing the whole stack.
 */
export const DASHILD_VERSION =
  packageInfo.dashildPackages ?? CREATE_VERSION;

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function datasource(provider: DatabaseProvider): string {
  // Prisma 7 reads the connection URL from prisma.config.ts, not the schema.
  return ["datasource db {", `  provider = "${provider}"`, "}"].join("\n");
}

function prismaConfig(directUrl: boolean): string {
  return `import "dotenv/config";

import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 CLI configuration.
 *
 * The app reads DATABASE_URL through its driver adapter; migrations use the
 * non-pooled URL when the provider needs one.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env(${JSON.stringify(directUrl ? "DIRECT_URL" : "DATABASE_URL")}),
  },
});
`;
}

function baseSchema(provider: DatabaseProvider): string {
  return `${datasource(provider)}

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

generator dashild {
  provider = "dashild-prisma-generator"
  output   = "../src/generated/dashild"
}
`;
}

function prismaClient(provider: DatabaseProvider): string {
  const header = `/**
 * Prisma client for the app.
 *
 * Prisma 7 uses driver adapters: there is no native engine.
 */
`;

  if (provider === "postgresql") {
    return `${header}import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL in the environment.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
`;
  }

  if (provider === "mysql") {
    return `${header}import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL in the environment.");
  }

  return new PrismaClient({
    adapter: new PrismaMariaDb(connectionString),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
`;
  }

  return `${header}import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL in the environment.");
  }

  // prisma.config.ts lives at the project root, so the CLI and this adapter
  // both resolve a relative file: URL from the working directory.
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: connectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
`;
}

function globalsCss(): string {
  return `@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

/* The shell lives in @dashild/admin; Tailwind must scan its build. */
@source "../../node_modules/@dashild/admin/dist";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-heading: var(--font-sans);
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
`;
}

function nextConfig(provider: DatabaseProvider): string {
  const external = ["@prisma/client"];
  if (provider === "postgresql") external.push("pg");
  if (provider === "mysql") external.push("mariadb");
  if (provider === "sqlite") external.push("better-sqlite3");

  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ${JSON.stringify(external)},
  // Next 16 only allows localhost for dev assets and HMR; opening 127.0.0.1
  // otherwise leaves the page without hydration.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // create-next-app wires Tailwind v4 through this Turbopack loader. Keep it:
  // without it @theme and package CSS imports fail to resolve.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
`;
}

function homePage(panelPath: string): string {
  return `import { redirect } from "next/navigation";

export default function Home() {
  redirect(${JSON.stringify(panelPath)});
}
`;
}

function loginPlaceholder(): string {
  return `export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold">Connect your auth</h1>
        <p className="text-sm text-muted-foreground">
          Dashild redirects here when there is no session. Implement
          <code> getCurrentUser </code>
          in <code>src/dashild/panel.ts</code> and replace this page with your
          login form.
        </p>
      </div>
    </main>
  );
}
`;
}

function envFile(options: {
  databaseUrl: string;
  directUrl?: string;
  auth: AuthProvider;
  secret: string;
}): string {
  const lines = [
    "# Database",
    `DATABASE_URL=${JSON.stringify(options.databaseUrl)}`,
  ];
  if (options.directUrl) {
    lines.push(`DIRECT_URL=${JSON.stringify(options.directUrl)}`);
  }
  if (options.auth === "better-auth") {
    lines.push(
      "",
      "# Better Auth. Generate the secret with: openssl rand -base64 32",
      `BETTER_AUTH_SECRET=${JSON.stringify(options.secret)}`,
      'BETTER_AUTH_URL="http://localhost:3000"',
    );
  }
  return `${lines.join("\n")}\n`;
}

function envExample(options: {
  databaseUrl: string;
  directUrl?: string;
  auth: AuthProvider;
}): string {
  const lines = [
    "# Database. Dashild does not start a database: point this at a running",
    "# PostgreSQL, MySQL or SQLite database (Neon, Supabase, PlanetScale...).",
    `DATABASE_URL=${JSON.stringify(options.databaseUrl)}`,
  ];
  if (options.directUrl) {
    lines.push(`DIRECT_URL=${JSON.stringify(options.directUrl)}`);
  }
  if (options.auth === "better-auth") {
    lines.push(
      "",
      "# Better Auth. Generate the secret with: openssl rand -base64 32",
      'BETTER_AUTH_SECRET=""',
      'BETTER_AUTH_URL="http://localhost:3000"',
    );
  }
  return `${lines.join("\n")}\n`;
}

function appendGitignore(dir: string): void {
  const path = resolve(dir, ".gitignore");
  const marker = "# Dashild";
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (existing.includes(marker)) return;

  const separator = existing === "" || existing.endsWith("\n") ? "" : "\n";
  const block = `${separator}
${marker}
!.env.example
/prisma/*.db
/prisma/*.db-journal
/src/generated/
`;
  writeFileSync(path, existing + block, "utf8");
}

export function writeScaffold(options: CreateOptions): string {
  const secret = randomBytes(32).toString("base64");
  const databaseUrl = options.databaseUrl;

  write(
    resolve(options.dir, "prisma/schema.prisma"),
    baseSchema(options.database),
  );
  write(
    resolve(options.dir, "prisma.config.ts"),
    prismaConfig(Boolean(options.directUrl)),
  );
  write(
    resolve(options.dir, "src/lib/prisma.ts"),
    prismaClient(options.database),
  );
  write(resolve(options.dir, "src/app/globals.css"), globalsCss());
  write(resolve(options.dir, "next.config.ts"), nextConfig(options.database));
  write(resolve(options.dir, "src/app/page.tsx"), homePage(options.panelPath));

  if (options.auth === "none") {
    write(
      resolve(options.dir, "src/app/login/page.tsx"),
      loginPlaceholder(),
    );
  }

  write(
    resolve(options.dir, ".env"),
    envFile({
      databaseUrl,
      directUrl: options.directUrl,
      auth: options.auth,
      secret,
    }),
  );
  appendGitignore(options.dir);

  write(
    resolve(options.dir, ".env.example"),
    envExample({
      databaseUrl,
      directUrl: options.directUrl,
      auth: options.auth,
    }),
  );

  if (options.packageManager === "pnpm") {
    const overrides = process.env.DASHILD_PACKAGES_FROM
      ? [
          "overrides:",
          ...["@dashild/core", "@dashild/admin", "@dashild/cli", "@dashild/prisma"].map(
            (name) =>
              `  ${JSON.stringify(name)}: ${JSON.stringify(
                packageSpec(name, DASHILD_VERSION),
              )}`,
          ),
        ].join("\n") + "\n"
      : "";

    write(
      resolve(options.dir, "pnpm-workspace.yaml"),
      `allowBuilds:
  prisma: true
  "@prisma/engines": true
  esbuild: true
  better-sqlite3: true
${overrides}`,
    );
  }

  return secret;
}

function adapterDependencies(provider: DatabaseProvider): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  if (provider === "postgresql") {
    return {
      dependencies: {
        "@prisma/adapter-pg": PRISMA_VERSION,
        pg: "^8.16.3",
      },
      devDependencies: {},
    };
  }

  if (provider === "mysql") {
    return {
      dependencies: {
        "@prisma/adapter-mariadb": PRISMA_VERSION,
        // The adapter pins this exact version; a newer one would be duplicated.
        mariadb: "3.5.4",
      },
      devDependencies: {},
    };
  }

  return {
    dependencies: {
      "@prisma/adapter-better-sqlite3": PRISMA_VERSION,
      "better-sqlite3": "^12.6.0",
    },
    devDependencies: { "@types/better-sqlite3": "^7.6.12" },
  };
}

/**
 * Test hook: install the workspace packages from a folder of tarballs.
 * `pnpm smoke:scaffold` uses it to exercise the real create path before the
 * version exists on npm.
 */
function packageSpec(name: string, version: string): string {
  const from = process.env.DASHILD_PACKAGES_FROM;
  if (!from) return version;
  const base = name.split("/").at(-1);
  return `file:${resolve(from, `dashild-${base}-${version}.tgz`)}`;
}

export function addDependencies(
  packageJsonPath: string,
  options: CreateOptions,
): void {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    name?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const adapters = adapterDependencies(options.database);
  const dependencies: Record<string, string> = {
    "@dashild/admin": packageSpec("@dashild/admin", DASHILD_VERSION),
    "@dashild/core": packageSpec("@dashild/core", DASHILD_VERSION),
    "@prisma/client": PRISMA_VERSION,
    shadcn: "^4.23.0",
    "tw-animate-css": "^1.4.0",
    ...adapters.dependencies,
  };
  if (options.auth === "better-auth") {
    dependencies["better-auth"] = BETTER_AUTH_VERSION;
  }

  const devDependencies: Record<string, string> = {
    "@dashild/cli": packageSpec("@dashild/cli", DASHILD_VERSION),
    "@dashild/prisma": packageSpec("@dashild/prisma", DASHILD_VERSION),
    // next.config.ts routes CSS through this loader; create-next-app already
    // adds it, and this keeps the config valid if that ever changes.
    "@tailwindcss/turbopack": "^4.3.3",
    prisma: PRISMA_VERSION,
    tsx: "^4.23.15",
    dotenv: "^18.0.10",
    ...adapters.devDependencies,
  };

  packageJson.name = options.name;
  packageJson.dependencies = {
    ...dependencies,
    ...packageJson.dependencies,
  };
  packageJson.devDependencies = {
    ...devDependencies,
    ...packageJson.devDependencies,
  };
  packageJson.scripts = {
    dashild: "dashild",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    ...packageJson.scripts,
    postinstall: packageJson.scripts?.postinstall ?? "prisma generate",
  };

  writeFileSync(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8",
  );
}

export function finalizePackageJson(
  packageJsonPath: string,
  hasSeed: boolean,
): void {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  packageJson.scripts = {
    ...packageJson.scripts,
  };
  if (hasSeed) {
    packageJson.scripts["db:seed"] = "tsx prisma/seed.ts";
  }
  writeFileSync(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8",
  );
}

export function pathExists(path: string): boolean {
  return existsSync(path);
}
