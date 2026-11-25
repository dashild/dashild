import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { uiAdd } from "../src/ui-add.js";

test("ui:add copies a template and skips an existing file", () => {
  const directory = mkdtempSync(join(tmpdir(), "dashild-ui-"));

  try {
    const first = uiAdd({
      cwd: directory,
      dir: "components/dashild",
      names: ["avatar-cell"],
    });
    assert.equal(first.created.length, 1);
    assert.equal(first.skipped.length, 0);
    assert.ok(existsSync(join(directory, "components/dashild/avatar-cell.tsx")));
    assert.match(
      readFileSync(
        join(directory, "components/dashild/avatar-cell.tsx"),
        "utf8",
      ),
      /registerCell\("avatar", AvatarCell\)/,
    );

    const second = uiAdd({
      cwd: directory,
      dir: "components/dashild",
      names: ["avatar-cell"],
    });
    assert.equal(second.created.length, 0);
    assert.equal(second.skipped.length, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("ui:add reports unknown components", () => {
  const directory = mkdtempSync(join(tmpdir(), "dashild-ui-"));

  try {
    const result = uiAdd({
      cwd: directory,
      dir: "components/dashild",
      names: ["missing"],
    });
    assert.deepEqual(result.unknown, ["missing"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
