import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

import type { DatabaseProvider, PackageManager } from "./types.js";

export const PACKAGE_MANAGERS: PackageManager[] = [
  "pnpm",
  "npm",
  "yarn",
  "bun",
];

export const DATABASES: DatabaseProvider[] = [
  "postgresql",
  "mysql",
  "sqlite",
];

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export function isValidProjectName(name: string): boolean {
  return NAME_PATTERN.test(name) && name.length <= 214;
}

export function detectPackageManager(
  userAgent = process.env.npm_config_user_agent,
): PackageManager {
  if (userAgent?.startsWith("pnpm/")) return "pnpm";
  if (userAgent?.startsWith("yarn/")) return "yarn";
  if (userAgent?.startsWith("bun/")) return "bun";
  return "npm";
}

export function inferProvider(url: string): DatabaseProvider | undefined {
  const scheme = url.split(":", 1)[0]?.toLowerCase();
  if (scheme === "postgres" || scheme === "postgresql") return "postgresql";
  if (scheme === "mysql" || scheme === "mariadb") return "mysql";
  if (scheme === "file" || scheme === "sqlite") return "sqlite";
  return undefined;
}

export function providerMatchesUrl(
  provider: DatabaseProvider,
  url: string,
): boolean {
  const inferred = inferProvider(url);
  return inferred === undefined || inferred === provider;
}

export function defaultDatabaseUrl(provider: DatabaseProvider): string {
  return provider === "sqlite" ? "file:./prisma/dev.db" : "";
}

export function looksPooled(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("-pooler") ||
      parsed.port === "6543" ||
      parsed.hostname.includes("pooler.")
    );
  } catch {
    return false;
  }
}

export function normalizePanelPath(value: string): string {
  const cleaned = value.trim().replace(/^\/+|\/+$/g, "");
  return `/${cleaned || "admin"}`;
}

export function resolveTargetDir(
  cwd: string,
  name: string,
  dir: string | undefined,
): string {
  if (dir) return resolve(cwd, dir);
  return resolve(cwd, name);
}

export function directoryState(
  dir: string,
): "missing" | "empty" | "occupied" {
  if (!existsSync(dir)) return "missing";
  if (!statSync(dir).isDirectory()) return "occupied";
  return readdirSync(dir).length === 0 ? "empty" : "occupied";
}

export function templateSourceLabel(spec: string): string {
  if (spec === "basic" || spec === "demo") return "bundled";
  if (spec.startsWith("github:")) return "github";
  if (spec.startsWith("local:")) return "local";
  return "local";
}

export function parseGitHubSpec(
  spec: string,
): { owner: string; repo: string; ref?: string } | undefined {
  if (!spec.startsWith("github:")) return undefined;
  const body = spec.slice("github:".length);
  const [repoPart, ref] = body.split("#", 2);
  if (!repoPart) return undefined;
  const [owner, repo] = repoPart.split("/", 2);
  if (!owner || !repo) return undefined;
  return { owner, repo, ref: ref || undefined };
}
