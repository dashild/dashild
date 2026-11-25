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

import { applyInit, formatInitPlan, planInit } from "../src/init.js";

function project(options: { next?: boolean } = {}): string {
  const directory = mkdtempSync(join(tmpdir(), "dashild-init-"));
  mkdirSync(join(directory, "src/app"), { recursive: true });
  mkdirSync(join(directory, "src/lib"), { recursive: true });
  mkdirSync(join(directory, "src/generated/dashild"), { recursive: true });

  const dependencies =
    options.next === false
      ? {}
      : {
          next: "16.4.6",
          "@dashild/admin": "0.0.0",
          "@dashild/core": "0.0.0",
          "@dashild/prisma": "0.0.0",
        };
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify(
      {
        name: "init-test",
        private: true,
        dependencies,
        scripts: { dev: "next dev" },
      },
      null,
      2,
    ),
    "utf8",
  );

  writeFileSync(
    join(directory, "src/lib/prisma.ts"),
    "export const prisma = {};\n",
    "utf8",
  );
  writeFileSync(
    join(directory, "src/generated/dashild/dashild-metadata.json"),
    JSON.stringify({ formatVersion: 1, models: [], enums: [] }),
    "utf8",
  );

  return directory;
}

test("init: plans the panel, runtime, icons and route", () => {
  const directory = project();

  try {
    const plan = planInit({ cwd: directory });

    assert.equal(plan.panelPath, "/admin");
    assert.equal(plan.scriptAdded, true);
    assert.equal(plan.warnings.length, 0);
    assert.equal(plan.files.length, 7);

    const paths = plan.files.map((file) => file.path);
    assert.ok(paths.some((path) => path.endsWith("src/dashild/panel.ts")));
    assert.ok(paths.some((path) => path.endsWith("src/dashild/runtime.ts")));
    assert.ok(paths.some((path) => path.endsWith("src/dashild/server.ts")));
    assert.ok(
      paths.some((path) =>
        path.endsWith("src/app/admin/[[...dashild]]/page.tsx"),
      ),
    );

    const route = plan.files.find((file) =>
      file.path.endsWith("page.tsx"),
    );
    assert.ok(route);
    assert.match(route.content, /@dashild\/admin\/server/);
    assert.match(route.content, /AdminPage/);
    assert.match(route.content, /from "..\/..\/..\/dashild\/panel"/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: applies the files and adds the script", () => {
  const directory = project();

  try {
    const plan = planInit({ cwd: directory });
    applyInit(plan);

    assert.ok(existsSync(join(directory, "src/dashild/panel.ts")));
    assert.ok(existsSync(join(directory, "src/dashild/server.ts")));
    assert.ok(
      existsSync(
        join(directory, "src/app/admin/[[...dashild]]/page.tsx"),
      ),
    );

    const packageJson = JSON.parse(
      readFileSync(join(directory, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    assert.equal(packageJson.scripts.dashild, "dashild");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: refuses to overwrite without --force", () => {
  const directory = project();

  try {
    applyInit(planInit({ cwd: directory }));
    assert.throws(
      () => planInit({ cwd: directory }),
      /already exists/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: chooses another route when /admin already exists", () => {
  const directory = project();

  try {
    mkdirSync(join(directory, "src/app/admin"), { recursive: true });
    writeFileSync(
      join(directory, "src/app/admin/page.tsx"),
      "export default function Page() { return null; }\n",
      "utf8",
    );

    const plan = planInit({ cwd: directory });

    assert.equal(plan.panelPath, "/panel");
    assert.ok(plan.warnings.some((warning) => warning.includes("/panel")));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: a missing Prisma module is a warning", () => {
  const directory = project();

  try {
    rmSync(join(directory, "src/lib/prisma.ts"));
    const plan = planInit({ cwd: directory });

    assert.ok(
      plan.warnings.some((warning) => warning.includes("Prisma")),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: requires Next.js", () => {
  const directory = project({ next: false });

  try {
    assert.throws(() => planInit({ cwd: directory }), /Next\.js/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: the plan is printable", () => {
  const directory = project();

  try {
    const text = formatInitPlan(planInit({ cwd: directory }));
    assert.match(text, /Panel: \/admin/);
    assert.match(text, /src\/dashild\/panel\.ts/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
