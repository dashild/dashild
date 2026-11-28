import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve, sep } from "node:path";

import { registerResource } from "@dashild/cli/register";
import semver from "semver";
import * as tar from "tar";
import { z } from "zod";

import { t } from "./messages.js";
import { parseGitHubSpec } from "./options.js";
import { BUNDLED_TEMPLATES } from "./templates/index.js";
import type {
  AuthProvider,
  DatabaseProvider,
  LoadedTemplate,
  Locale,
  TemplateManifest,
} from "./types.js";

const providerSchema = z.enum(["postgresql", "mysql", "sqlite"]);
const authSchema = z.enum(["better-auth", "none"]);

const manifestSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().min(1),
    description: z.string().optional(),
    author: z.string().optional(),
    license: z.string().optional(),
    dashild: z.string().min(1),
    prisma: z
      .object({ provider: z.array(providerSchema).min(1).optional() })
      .optional(),
    requires: z
      .object({
        auth: z.array(authSchema).min(1).optional(),
        tenancy: z.boolean().optional(),
      })
      .optional(),
    extend: z.record(z.string(), z.array(z.string())).optional(),
    overwrite: z.array(z.string()).optional(),
    dependencies: z.record(z.string(), z.string()).optional(),
    devDependencies: z.record(z.string(), z.string()).optional(),
    env: z.array(z.string()).optional(),
  })
  .passthrough();

const SKIP_DIRECTORIES = new Set(["node_modules", ".git", ".next", ".turbo"]);

const BASIC_TEMPLATE: LoadedTemplate = {
  manifest: {
    name: "basic",
    version: "0.0.0",
    description: "Panel only",
    dashild: "*",
  },
  files: new Map(),
  source: "bundled",
};

function parseManifest(source: string, locale: Locale): TemplateManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch (error) {
    throw new Error(
      t(locale, "manifestInvalid", {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      t(locale, "manifestInvalid", {
        error: parsed.error.issues[0]?.message ?? "invalid manifest",
      }),
    );
  }

  return parsed.data;
}

function readFiles(root: string): Map<string, string> {
  const files = new Map<string, string>();

  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "template.json") continue;
      if (entry.name === ".DS_Store") continue;

      const full = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name)) continue;
        walk(full);
        continue;
      }

      if (!entry.isFile()) continue;

      const content = readFileSync(full, "utf8");
      // Starters are text-only. A binary file would corrupt the project.
      if (content.includes("\u0000")) continue;

      const key = relative(root, full).split(sep).join("/");
      files.set(key, content);
    }
  };

  walk(root);
  return files;
}

function findTemplateRoot(directory: string): string | undefined {
  if (existsSync(resolve(directory, "template.json"))) return directory;

  const candidates = readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && !SKIP_DIRECTORIES.has(entry.name),
    )
    .map((entry) => resolve(directory, entry.name))
    .filter((path) => existsSync(resolve(path, "template.json")));

  return candidates.length === 1 ? candidates[0] : undefined;
}

function loadTemplateDirectory(
  templateRoot: string,
  source: string,
  locale: Locale,
): LoadedTemplate {
  const manifest = parseManifest(
    readFileSync(resolve(templateRoot, "template.json"), "utf8"),
    locale,
  );

  return {
    manifest,
    files: readFiles(templateRoot),
    source,
  };
}

function bundledTemplateDirectory(name: string): string | undefined {
  for (const candidate of [`../templates/${name}`, `../../templates/${name}`]) {
    const directory = fileURLToPath(new URL(candidate, import.meta.url));
    if (existsSync(resolve(directory, "template.json"))) return directory;
  }
  return undefined;
}

function loadLocalTemplate(
  spec: string,
  locale: Locale,
): LoadedTemplate {
  const rawPath = spec.startsWith("local:") ? spec.slice(6) : spec;
  const root = resolve(rawPath);
  const templateRoot = findTemplateRoot(root);

  if (!templateRoot) {
    throw new Error(t(locale, "templateNotFound", { spec }));
  }

  return loadTemplateDirectory(templateRoot, spec, locale);
}

async function githubDefaultBranch(
  owner: string,
  repo: string,
): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "create-dashild",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub responded ${response.status} for ${owner}/${repo}`);
  }

  const data = (await response.json()) as { default_branch?: string };
  return data.default_branch ?? "main";
}

function cacheKey(owner: string, repo: string, ref: string): string {
  return `${owner}-${repo}-${ref}`.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function loadGitHubTemplate(
  spec: string,
  locale: Locale,
): Promise<LoadedTemplate> {
  const parsed = parseGitHubSpec(spec);
  if (!parsed) {
    throw new Error(t(locale, "templateNotFound", { spec }));
  }

  const ref = parsed.ref ?? (await githubDefaultBranch(parsed.owner, parsed.repo));
  const cacheDir = resolve(
    homedir(),
    ".cache/dashild/templates",
    cacheKey(parsed.owner, parsed.repo, ref),
  );

  let templateRoot = existsSync(cacheDir)
    ? findTemplateRoot(cacheDir)
    : undefined;

  if (!templateRoot) {
    mkdirSync(cacheDir, { recursive: true });
    const archive = resolve(cacheDir, "template.tgz");
    const url = `https://codeload.github.com/${parsed.owner}/${parsed.repo}/tar.gz/${ref}`;
    const response = await fetch(url, {
      headers: { "user-agent": "create-dashild" },
    });

    if (!response.ok) {
      throw new Error(`GitHub responded ${response.status} for ${spec}`);
    }

    writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
    await tar.x({ file: archive, cwd: cacheDir });
    rmSync(archive, { force: true });

    templateRoot = findTemplateRoot(cacheDir);
  }

  if (!templateRoot) {
    throw new Error(t(locale, "noTemplate", { spec }));
  }

  const manifest = parseManifest(
    readFileSync(resolve(templateRoot, "template.json"), "utf8"),
    locale,
  );

  return {
    manifest,
    files: readFiles(templateRoot),
    source: spec,
  };
}

export async function loadTemplate(
  spec: string,
  locale: Locale,
): Promise<LoadedTemplate> {
  if (spec === "basic") return BASIC_TEMPLATE;

  const bundled = BUNDLED_TEMPLATES[spec];
  if (bundled) return bundled;

  const bundledDirectory = bundledTemplateDirectory(spec);
  if (bundledDirectory) {
    return loadTemplateDirectory(bundledDirectory, spec, locale);
  }

  if (spec.startsWith("github:")) {
    return loadGitHubTemplate(spec, locale);
  }

  if (spec.startsWith("local:") || spec.startsWith(".") || spec.startsWith("/")) {
    return loadLocalTemplate(spec, locale);
  }

  throw new Error(t(locale, "templateNotFound", { spec }));
}

export function validateTemplate(
  template: LoadedTemplate,
  options: {
    auth: AuthProvider;
    database: DatabaseProvider;
    dashildVersion: string;
    locale: Locale;
    tenancy?: boolean;
  },
): void {
  const { manifest } = template;
  if (manifest.name === "basic") return;

  const auth = manifest.requires?.auth;
  if (auth && !auth.includes(options.auth)) {
    throw new Error(
      t(options.locale, "templateAuth", { auth: auth.join(" or ") }),
    );
  }

  if (manifest.requires?.tenancy === true && !options.tenancy) {
    throw new Error(t(options.locale, "templateTenancy"));
  }
  if (manifest.requires?.tenancy === false && options.tenancy) {
    throw new Error(t(options.locale, "templateNoTenancy"));
  }

  const providers = manifest.prisma?.provider;
  if (providers && !providers.includes(options.database)) {
    throw new Error(
      t(options.locale, "templateProvider", { provider: options.database }),
    );
  }

  if (
    manifest.dashild !== "*" &&
    !semver.satisfies(options.dashildVersion, manifest.dashild, {
      includePrerelease: true,
    })
  ) {
    throw new Error(
      t(options.locale, "templateVersion", { range: manifest.dashild }),
    );
  }
}

function blockNames(schema: string): Set<string> {
  const names = new Set<string>();
  for (const match of schema.matchAll(
    /^\s*(?:model|enum)\s+(\w+)\s*\{/gm,
  )) {
    const name = match[1];
    if (name) names.add(name);
  }
  return names;
}

function insertIntoModel(
  schema: string,
  model: string,
  lines: string[],
): string {
  const pattern = new RegExp(`model\\s+${model}\\s*\\{`);
  const match = pattern.exec(schema);
  if (!match) {
    throw new Error(`Model ${model} was not found in the Prisma schema.`);
  }

  const open = match.index + match[0].length;
  let depth = 1;
  let cursor = open;
  while (cursor < schema.length && depth > 0) {
    const char = schema[cursor];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    cursor += 1;
  }

  if (depth !== 0) {
    throw new Error(`Model ${model} has an unbalanced body.`);
  }

  const close = cursor - 1;
  const body = schema.slice(open, close);
  const existing = new Set(
    body
      .split("\n")
      .map((line) => line.trim().split(/\s+/, 1)[0])
      .filter((name): name is string => Boolean(name)),
  );

  const additions = lines.filter((line) => {
    const name = line.trim().split(/\s+/, 1)[0];
    return name ? !existing.has(name) : false;
  });

  if (additions.length === 0) return schema;

  const block = additions.map((line) => `  ${line}`).join("\n");
  return `${schema.slice(0, close)}\n${block}\n${schema.slice(close)}`;
}

function renderTemplateFile(
  content: string,
  destination: string,
  libDir: string,
): string {
  const specifier = relative(dirname(destination), libDir)
    .split(sep)
    .join("/");
  const withDot = specifier.startsWith(".") ? specifier : `./${specifier}`;
  return content.replaceAll("__DASHILD_LIB__", withDot);
}

function resourceInfo(content: string): {
  exportName: string;
  model: string;
} | undefined {
  const exportMatch = /export\s+const\s+(\w+)\s*=\s*defineResource\s*\(/.exec(
    content,
  );
  const modelMatch = /model\s*:\s*["']([^"']+)["']/.exec(content);
  if (!exportMatch?.[1] || !modelMatch?.[1]) return undefined;
  return { exportName: exportMatch[1], model: modelMatch[1] };
}

export interface ApplyTemplateInput {
  projectDir: string;
  template: LoadedTemplate;
  auth: AuthProvider;
  database: DatabaseProvider;
  schemaPath: string;
  panelFile: string;
  policiesFile: string;
  libDir: string;
  packageJsonPath: string;
  locale: Locale;
}

export interface ApplyTemplateResult {
  written: string[];
  warnings: string[];
  hasSeed: boolean;
  resources: string[];
}

export function applyTemplate(input: ApplyTemplateInput): ApplyTemplateResult {
  const { template, projectDir, locale } = input;
  const written: string[] = [];
  const warnings: string[] = [];
  const resources: string[] = [];

  if (template.files.size === 0) {
    return { written, warnings, hasSeed: false, resources };
  }

  const marker = `// --- dashild template: ${template.manifest.name} ---`;
  const endMarker = `// --- end dashild template: ${template.manifest.name} ---`;
  let schema = readFileSync(input.schemaPath, "utf8");

  if (schema.includes(marker)) {
    throw new Error(`Template ${template.manifest.name} is already applied.`);
  }

  const models = template.files.get("prisma/models.prisma");
  if (models) {
    const existing = blockNames(schema);
    for (const name of blockNames(models)) {
      if (existing.has(name)) {
        throw new Error(t(locale, "schemaCollision", { model: name }));
      }
    }

    schema = `${schema.trimEnd()}\n\n${marker}\n${models.trimEnd()}\n${endMarker}\n`;
  }

  for (const [model, lines] of Object.entries(
    template.manifest.extend ?? {},
  )) {
    schema = insertIntoModel(schema, model, lines);
  }

  writeFileSync(input.schemaPath, schema, "utf8");
  written.push(relative(projectDir, input.schemaPath));

  const special = new Set([
    "prisma/models.prisma",
    "prisma/seed.ts",
    "src/dashild/policies.ts",
  ]);

  for (const [key, content] of template.files) {
    if (key === "template.json") continue;
    if (key.startsWith("src/dashild/resources/")) {
      const destination = resolve(projectDir, key);
      if (existsSync(destination)) {
        throw new Error(t(locale, "resourceExists", { path: key }));
      }
      const rendered = renderTemplateFile(content, destination, input.libDir);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, rendered, "utf8");
      written.push(key);

      const info = resourceInfo(rendered);
      if (!info) {
        warnings.push(`Could not read the model/export from ${key}.`);
        continue;
      }

      const result = registerResource({
        panelPath: input.panelFile,
        policiesPath: input.policiesFile,
        resourceFile: destination,
        exportName: info.exportName,
        model: info.model,
      });
      warnings.push(...result.warnings);
      resources.push(info.model);
      continue;
    }

    if (key === "src/dashild/policies.ts") {
      const destination = resolve(projectDir, key);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(
        destination,
        renderTemplateFile(content, destination, input.libDir),
        "utf8",
      );
      written.push(key);
      continue;
    }

    if (key === "prisma/seed.ts") {
      const destination = resolve(projectDir, key);
      if (existsSync(destination)) {
        throw new Error(t(locale, "resourceExists", { path: key }));
      }
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(
        destination,
        renderTemplateFile(content, destination, input.libDir),
        "utf8",
      );
      written.push(key);
      continue;
    }

    if (special.has(key)) continue;

    const allowed = ["src/", "prisma/", "public/", "scripts/"].some((prefix) =>
      key.startsWith(prefix),
    );
    if (!allowed) {
      warnings.push(`Skipped ${key}: outside src/, prisma/, public/ or scripts/.`);
      continue;
    }

    const destination = resolve(projectDir, key);
    const overwrite = template.manifest.overwrite?.includes(key) ?? false;
    if (existsSync(destination) && !overwrite) {
      warnings.push(`Skipped ${key}: it already exists.`);
      continue;
    }

    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(
      destination,
      renderTemplateFile(content, destination, input.libDir),
      "utf8",
    );
    written.push(key);
  }

  const packageJson = JSON.parse(
    readFileSync(input.packageJsonPath, "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  if (template.manifest.dependencies) {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      ...template.manifest.dependencies,
    };
  }
  if (template.manifest.devDependencies) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      ...template.manifest.devDependencies,
    };
  }
  writeFileSync(
    input.packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8",
  );

  if (template.manifest.env?.length) {
    const envExample = resolve(projectDir, ".env.example");
    if (existsSync(envExample)) {
      const current = readFileSync(envExample, "utf8");
      const missing = template.manifest.env.filter(
        (key) => !new RegExp(`^${key}=`, "m").test(current),
      );
      if (missing.length > 0) {
        writeFileSync(
          envExample,
          `${current.trimEnd()}\n${missing.map((key) => `${key}=`).join("\n")}\n`,
          "utf8",
        );
        warnings.push(
          t(locale, "templateEnv", {
            file: ".env.example",
            keys: missing.join(", "),
          }),
        );
      }
    } else {
      warnings.push(
        t(locale, "templateEnvMissing", { keys: template.manifest.env.join(", ") }),
      );
    }
  }

  return {
    written,
    warnings,
    hasSeed: template.files.has("prisma/seed.ts"),
    resources,
  };
}

export { BASIC_TEMPLATE };
