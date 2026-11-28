import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { applyUpgradeCodemods } from "../src/upgrade-codemods.js";

const SERVER = `"use server";

// dashild:generated 0.1.0-alpha.11
import type {
  RuntimeActionInput,
  RuntimeActionResult,
  RuntimeSaveResult,
} from "@dashild/core/server";

export async function saveResource(input: {
  slug: string;
}): Promise<RuntimeSaveResult> {
  return { ok: true };
}
`;

const ROUTE = `// dashild:generated 0.1.0-alpha.11
import {
  deleteResource,
  runRelationAction,
  saveResource,
  toggleTheme,
} from "../../../dashild/server";

export default function Page() {
  return (
    <AdminPage
      themeAction={toggleTheme}
    />
  );
}
`;

function fixture(): string {
  const cwd = mkdtempSync(join(tmpdir(), "dashild-codemod-"));
  mkdirSync(join(cwd, "src/dashild"), { recursive: true });
  mkdirSync(join(cwd, "src/app/admin/[[...dashild]]"), { recursive: true });
  writeFileSync(join(cwd, "src/dashild/server.ts"), SERVER, "utf8");
  writeFileSync(
    join(cwd, "src/app/admin/[[...dashild]]/page.tsx"),
    ROUTE,
    "utf8",
  );
  return cwd;
}

test("upgrade codemod adds CSV actions and props", () => {
  const cwd = fixture();

  try {
    const result = applyUpgradeCodemods({
      cwd,
      panelPath: "/admin",
      target: "0.1.0-alpha.12",
    });

    assert.deepEqual(result.applied, ["csv-export-import"]);

    const server = readFileSync(join(cwd, "src/dashild/server.ts"), "utf8");
    assert.match(server, /export async function exportResource/);
    assert.match(server, /export async function importResource/);
    assert.match(server, /RuntimeExportResult/);
    assert.match(server, /dashild:generated 0\.1\.0-alpha\.12/);

    const route = readFileSync(
      join(cwd, "src/app/admin/[[...dashild]]/page.tsx"),
      "utf8",
    );
    assert.match(route, /exportResource,/);
    assert.match(route, /exportAction=\{exportResource\}/);
    assert.match(route, /importAction=\{importResource\}/);
    assert.match(route, /dashild:generated 0\.1\.0-alpha\.12/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("upgrade codemod is idempotent", () => {
  const cwd = fixture();

  try {
    applyUpgradeCodemods({
      cwd,
      panelPath: "/admin",
      target: "0.1.0-alpha.12",
    });
    const second = applyUpgradeCodemods({
      cwd,
      panelPath: "/admin",
      target: "0.1.0-alpha.12",
    });

    assert.deepEqual(second.applied, []);
    const server = readFileSync(join(cwd, "src/dashild/server.ts"), "utf8");
    assert.equal(
      server.match(/export async function exportResource/g)?.length,
      1,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("upgrade codemod does not run before its version", () => {
  const cwd = fixture();

  try {
    const result = applyUpgradeCodemods({
      cwd,
      panelPath: "/admin",
      target: "0.1.0-alpha.11",
    });

    assert.deepEqual(result.applied, []);
    assert.equal(
      readFileSync(join(cwd, "src/dashild/server.ts"), "utf8"),
      SERVER,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("upgrade codemod dry run does not write", () => {
  const cwd = fixture();

  try {
    const result = applyUpgradeCodemods({
      cwd,
      panelPath: "/admin",
      target: "0.1.0-alpha.12",
      dryRun: true,
    });

    assert.deepEqual(result.applied, ["csv-export-import"]);
    assert.equal(
      readFileSync(join(cwd, "src/dashild/server.ts"), "utf8"),
      SERVER,
    );
    assert.ok(
      existsSync(join(cwd, "src/app/admin/[[...dashild]]/page.tsx")),
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
