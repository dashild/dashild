import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { upgrade } from "../src/upgrade.js";

function fixture(options: { marker?: string | null } = {}): string {
  const directory = mkdtempSync(join(tmpdir(), "dashild-upgrade-"));
  mkdirSync(join(directory, "src/dashild"), { recursive: true });
  mkdirSync(join(directory, "src/lib"), { recursive: true });

  writeFileSync(
    join(directory, "package.json"),
    `${JSON.stringify(
      {
        name: "upgrade-fixture",
        packageManager: "pnpm@12.15.0",
        dependencies: {
          "@dashild/admin": "0.1.0-alpha.10",
          "@dashild/core": "0.1.0-alpha.10",
        },
        devDependencies: {
          "@dashild/cli": "0.1.0-alpha.10",
          "@dashild/prisma": "0.1.0-alpha.10",
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    join(directory, "dashild.json"),
    `${JSON.stringify(
      {
        version: 1,
        stackVersion: "0.1.0-alpha.10",
        template: { name: "basic", version: "0.0.0", source: "bundled" },
        auth: "better-auth",
        database: "sqlite",
        panelPath: "/admin",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const marker =
    options.marker === undefined ? "// dashild:generated 0.1.0-alpha.10\n" : "";
  writeFileSync(
    join(directory, "src/dashild/panel.ts"),
    `${marker}export const panel = {};\n`,
    "utf8",
  );
  writeFileSync(
    join(directory, "src/dashild/policies.ts"),
    "export const policies = {};\n",
    "utf8",
  );
  writeFileSync(
    join(directory, "src/lib/session.ts"),
    'export async function getCurrentUser() { return null; }\n',
    "utf8",
  );

  return directory;
}

const target = async () => "0.1.0-alpha.12";

test("upgrade: dry run reports the target without writing", async () => {
  const directory = fixture();

  try {
    const result = await upgrade({
      cwd: directory,
      dryRun: true,
      resolveTarget: target,
    });

    assert.equal(result.target, "0.1.0-alpha.12");
    assert.equal(result.outdated, true);
    assert.equal(result.updated, false);
    assert.equal(result.installed, false);

    const packageJson = JSON.parse(
      readFileSync(join(directory, "package.json"), "utf8"),
    );
    assert.equal(
      packageJson.dependencies["@dashild/core"],
      "0.1.0-alpha.10",
    );

    const glue = result.glue.find((file) =>
      file.path.endsWith("src/dashild/policies.ts"),
    );
    assert.equal(glue?.version, null);
    assert.ok(
      result.notes.some((note) => note.includes("version markers")),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("upgrade: updates dependencies, records the stack and regenerates", async () => {
  const directory = fixture();
  const commands: string[] = [];

  try {
    const result = await upgrade({
      cwd: directory,
      resolveTarget: target,
      run: (command, args) => {
        commands.push(`${command} ${args.join(" ")}`);
      },
    });

    assert.equal(result.updated, true);
    assert.equal(result.installed, true);
    assert.equal(result.generated, true);
    assert.equal(commands[0], "pnpm install");
    assert.match(commands[1] ?? "", /prisma generate$/);

    const packageJson = JSON.parse(
      readFileSync(join(directory, "package.json"), "utf8"),
    );
    for (const section of ["dependencies", "devDependencies"]) {
      for (const [name, version] of Object.entries(packageJson[section])) {
        if (name.startsWith("@dashild/")) {
          assert.equal(version, "0.1.0-alpha.12");
        }
      }
    }

    const dashildJson = JSON.parse(
      readFileSync(join(directory, "dashild.json"), "utf8"),
    );
    assert.equal(dashildJson.stackVersion, "0.1.0-alpha.12");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("upgrade --check does not install or write", async () => {
  const directory = fixture();
  const commands: string[] = [];

  try {
    const result = await upgrade({
      cwd: directory,
      check: true,
      resolveTarget: async () => "0.1.0-alpha.10",
      run: (command, args) => {
        commands.push(`${command} ${args.join(" ")}`);
      },
    });

    assert.equal(result.outdated, false);
    assert.equal(result.updated, false);
    assert.deepEqual(commands, []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("upgrade: refuses a project without Dashild dependencies", async () => {
  const directory = mkdtempSync(join(tmpdir(), "dashild-upgrade-"));

  try {
    writeFileSync(
      join(directory, "package.json"),
      `${JSON.stringify({ name: "plain", dependencies: {} }, null, 2)}\n`,
      "utf8",
    );

    await assert.rejects(
      () => upgrade({ cwd: directory, resolveTarget: target }),
      /does not look like a Dashild app/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("upgrade: refuses packages that are not in lockstep", async () => {
  const directory = fixture();

  try {
    await assert.rejects(
      () =>
        upgrade({
          cwd: directory,
          resolveTarget: async (name) =>
            name === "@dashild/cli" ? "0.1.0-alpha.13" : "0.1.0-alpha.12",
        }),
      /lockstep/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
