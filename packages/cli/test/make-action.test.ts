import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { makeAction } from "../src/make-action.js";

function fixture(source = "") {
  const directory = mkdtempSync(join(tmpdir(), "dashild-action-"));
  const path = join(directory, "src/dashild/actions/index.ts");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    source ||
      'import type { ActionHandler } from "@dashild/core";\n\nexport const resourceActions: Record<string, Record<string, ActionHandler>> = {};\n',
    "utf8",
  );
  return { directory, path };
}

test("make:action appends a typed handler stub", () => {
  const f = fixture();

  try {
    const result = makeAction({
      cwd: f.directory,
      model: "Customer",
      action: "export",
    });

    assert.equal(result.created, true);
    const source = readFileSync(f.path, "utf8");
    assert.match(source, /dashild make:action:Customer:export/);
    assert.match(source, /resourceActions\.Customer = \{/);
    assert.match(source, /export: async \(_context\)/);
    assert.match(source, /TODO: implement Customer\.export/);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test("make:action is idempotent", () => {
  const f = fixture();

  try {
    makeAction({ cwd: f.directory, model: "Customer", action: "export" });
    const second = makeAction({
      cwd: f.directory,
      model: "Customer",
      action: "export",
    });

    assert.equal(second.created, false);
    const source = readFileSync(f.path, "utf8");
    assert.equal(
      source.match(/dashild make:action:Customer:export/g)?.length,
      1,
    );
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test("make:action requires an existing actions file", () => {
  const directory = mkdtempSync(join(tmpdir(), "dashild-action-"));

  try {
    assert.equal(
      existsSync(join(directory, "src/dashild/actions/index.ts")),
      false,
    );
    assert.throws(() =>
      makeAction({ cwd: directory, model: "Customer", action: "export" }),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("make:action rejects invalid names", () => {
  const f = fixture();

  try {
    assert.throws(() =>
      makeAction({ cwd: f.directory, model: "Customer; drop", action: "export" }),
    );
    assert.throws(() =>
      makeAction({ cwd: f.directory, model: "Customer", action: "export()" }),
    );
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});
