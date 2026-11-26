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
import { dirname, join } from "node:path";
import { test } from "node:test";

import { eject } from "../src/eject.js";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "dashild-eject-"));
  const write = (path: string, content = "") => {
    const file = join(directory, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content, "utf8");
  };

  write(
    "src/dashild/panel.ts",
    'export const panel = definePanel({ path: "/panel" });\n',
  );
  write("src/dashild/policies.ts", "export const policies = {};\n");
  write("src/dashild/runtime.ts", "export const runtime = {};\n");
  write("src/dashild/server.ts", "export const server = {};\n");
  write("src/dashild/icons.tsx", "export const icons = {};\n");
  write("src/dashild/registry.tsx", "export const registry = {};\n");
  write("src/dashild/actions/index.ts", "export const actions = {};\n");
  write("src/dashild/resources/user.ts", "export const userResource = {};\n");
  write("src/lib/auth.ts", "export const auth = {};\n");
  write("src/lib/auth-client.ts", "export const authClient = {};\n");
  write("src/app/panel/[[...dashild]]/page.tsx", "export default function Page() {}\n");
  write(
    "prisma/schema.prisma",
    "generator dashild {\n  provider = \"dashild-prisma-generator\"\n}\n",
  );
  write(
    "package.json",
    JSON.stringify(
      { scripts: { dashild: "dashild", build: "next build" } },
      null,
      2,
    ),
  );

  return directory;
}

test("eject: dry run lists the panel files and keeps app-owned ones", () => {
  const directory = fixture();

  try {
    const result = eject({ cwd: directory, dryRun: true });

    assert.equal(result.applied, false);
    assert.ok(result.removed.includes("src/dashild/panel.ts"));
    assert.ok(
      result.removed.includes("src/app/panel/[[...dashild]]/page.tsx"),
    );
    assert.ok(result.removed.includes("package.json (dashild script)"));
    assert.ok(result.kept.includes("src/dashild/resources/user.ts"));
    assert.ok(result.kept.includes("src/lib/auth.ts"));
    assert.ok(result.kept.includes("prisma/schema.prisma (generator dashild)"));

    assert.equal(existsSync(join(directory, "src/dashild/panel.ts")), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("eject: --yes removes only the panel scaffolding", () => {
  const directory = fixture();

  try {
    const result = eject({ cwd: directory, yes: true });

    assert.equal(result.applied, true);
    for (const path of [
      "src/dashild/panel.ts",
      "src/dashild/policies.ts",
      "src/dashild/runtime.ts",
      "src/dashild/server.ts",
      "src/dashild/icons.tsx",
      "src/dashild/registry.tsx",
      "src/dashild/actions/index.ts",
      "src/app/panel/[[...dashild]]/page.tsx",
    ]) {
      assert.equal(existsSync(join(directory, path)), false, path);
    }

    assert.equal(
      existsSync(join(directory, "src/dashild/resources/user.ts")),
      true,
    );
    assert.equal(existsSync(join(directory, "src/lib/auth.ts")), true);
    assert.equal(existsSync(join(directory, "src/dashild/actions")), false);
    assert.equal(existsSync(join(directory, "src/app/panel")), false);

    const packageJson = JSON.parse(
      readFileSync(join(directory, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    assert.equal(packageJson.scripts.dashild, undefined);
    assert.equal(packageJson.scripts.build, "next build");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("eject: without --yes it does not touch the project", () => {
  const directory = fixture();

  try {
    const result = eject({ cwd: directory });

    assert.equal(result.applied, false);
    assert.equal(existsSync(join(directory, "src/dashild/panel.ts")), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
