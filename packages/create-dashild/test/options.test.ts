import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  DATABASES,
  PACKAGE_MANAGERS,
  defaultDatabaseUrl,
  detectPackageManager,
  directoryState,
  inferProvider,
  isValidProjectName,
  looksPooled,
  normalizePanelPath,
  parseGitHubSpec,
  providerMatchesUrl,
  resolveTargetDir,
  templateSourceLabel,
} from "../src/options.js";

test("project names follow the npm rules", () => {
  assert.equal(isValidProjectName("my-app"), true);
  assert.equal(isValidProjectName("dashild.admin_2"), true);
  assert.equal(isValidProjectName("MyApp"), false);
  assert.equal(isValidProjectName("-app"), false);
  assert.equal(isValidProjectName(""), false);
  assert.equal(isValidProjectName("app name"), false);
});

test("package managers are detected from the user agent", () => {
  assert.equal(detectPackageManager("pnpm/12.0.0 npm/? node/v24"), "pnpm");
  assert.equal(detectPackageManager("yarn/4.1.0 npm/? node/v24"), "yarn");
  assert.equal(detectPackageManager("bun/1.3.0 npm/? node/v24"), "bun");
  assert.equal(detectPackageManager("npm/11.0.0 node/v24"), "npm");
  assert.equal(detectPackageManager(""), "npm");
  assert.deepEqual(PACKAGE_MANAGERS, ["pnpm", "npm", "yarn", "bun"]);
});

test("the database provider is inferred from the URL scheme", () => {
  assert.equal(inferProvider("postgresql://user:pw@host/db"), "postgresql");
  assert.equal(inferProvider("postgres://user:pw@host/db"), "postgresql");
  assert.equal(inferProvider("mysql://user:pw@host/db"), "mysql");
  assert.equal(inferProvider("mariadb://user:pw@host/db"), "mysql");
  assert.equal(inferProvider("file:./dev.db"), "sqlite");
  assert.equal(inferProvider("sqlite:./dev.db"), "sqlite");
  assert.equal(inferProvider("https://example.com"), undefined);
  assert.deepEqual(DATABASES, ["postgresql", "mysql", "sqlite"]);
});

test("a URL has to match the explicit provider", () => {
  assert.equal(providerMatchesUrl("postgresql", "postgresql://host/db"), true);
  assert.equal(providerMatchesUrl("postgresql", "mysql://host/db"), false);
  assert.equal(providerMatchesUrl("mysql", "mysql://host/db"), true);
  assert.equal(providerMatchesUrl("sqlite", "file:./dev.db"), true);
  assert.equal(providerMatchesUrl("sqlite", "postgresql://host/db"), false);
  assert.equal(providerMatchesUrl("postgresql", "not-a-url"), true);
});

test("sqlite has a default URL, the servers do not", () => {
  assert.equal(defaultDatabaseUrl("sqlite"), "file:./prisma/dev.db");
  assert.equal(defaultDatabaseUrl("postgresql"), "");
  assert.equal(defaultDatabaseUrl("mysql"), "");
});

test("pooled URLs are recognised", () => {
  assert.equal(
    looksPooled("postgresql://user:pw@ep-cool-pooler.eu.neon.tech/db"),
    true,
  );
  assert.equal(looksPooled("postgresql://user:pw@db.example.com:6543/db"), true);
  assert.equal(
    looksPooled("postgresql://user:pw@pooler.supabase.com:5432/db"),
    true,
  );
  assert.equal(looksPooled("postgresql://user:pw@db.example.com:5432/db"), false);
  assert.equal(looksPooled(""), false);
  assert.equal(looksPooled("not-a-url"), false);
});

test("panel paths are absolute and default to /admin", () => {
  assert.equal(normalizePanelPath(""), "/admin");
  assert.equal(normalizePanelPath("  "), "/admin");
  assert.equal(normalizePanelPath("admin"), "/admin");
  assert.equal(normalizePanelPath("/admin/"), "/admin");
  assert.equal(normalizePanelPath("backoffice/panel"), "/backoffice/panel");
});

test("target directories resolve from the cwd", () => {
  assert.equal(resolveTargetDir("/tmp/work", "app", undefined), "/tmp/work/app");
  assert.equal(resolveTargetDir("/tmp/work", "app", "custom"), "/tmp/work/custom");
});

test("template sources are labelled", () => {
  assert.equal(templateSourceLabel("basic"), "bundled");
  assert.equal(templateSourceLabel("demo"), "bundled");
  assert.equal(templateSourceLabel("github:acme/starter"), "github");
  assert.equal(templateSourceLabel("local:./starter"), "local");
  assert.equal(templateSourceLabel("./starter"), "local");
});

test("github specs carry an optional ref", () => {
  assert.deepEqual(parseGitHubSpec("github:acme/starter"), {
    owner: "acme",
    repo: "starter",
    ref: undefined,
  });
  assert.deepEqual(parseGitHubSpec("github:acme/starter#main"), {
    owner: "acme",
    repo: "starter",
    ref: "main",
  });
  assert.equal(parseGitHubSpec("acme/starter"), undefined);
  assert.equal(parseGitHubSpec("github:acme"), undefined);
});

test("directory state distinguishes missing, empty and occupied", () => {
  const root = mkdtempSync(join(tmpdir(), "dashild-dir-"));
  try {
    assert.equal(directoryState(join(root, "missing")), "missing");

    const empty = join(root, "empty");
    mkdirSync(empty);
    assert.equal(directoryState(empty), "empty");

    writeFileSync(join(empty, "file.txt"), "x");
    assert.equal(directoryState(empty), "occupied");

    writeFileSync(join(root, "file.txt"), "x");
    assert.equal(directoryState(join(root, "file.txt")), "occupied");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
