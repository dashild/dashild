import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { skillInstall } from "../src/skill-install.js";

const source = fileURLToPath(
  new URL("../../skills/dashild", import.meta.url),
);

function project(): string {
  return mkdtempSync(join(tmpdir(), "dashild-skill-"));
}

test("skill install copies the skill to both agents", () => {
  const cwd = project();

  try {
    const result = skillInstall({ cwd, source });

    assert.deepEqual(result.agents, ["claude", "opencode"]);
    assert.ok(
      existsSync(join(cwd, ".claude/skills/dashild/SKILL.md")),
    );
    assert.ok(
      existsSync(
        join(cwd, ".opencode/skills/dashild/references/policies.md"),
      ),
    );

    const agents = readFileSync(join(cwd, "AGENTS.md"), "utf8");
    assert.match(agents, /dashild:skill:begin/);
    assert.match(agents, /\.claude\/skills\/dashild\/SKILL\.md/);
    assert.match(agents, /\.opencode\/skills\/dashild\/SKILL\.md/);
    assert.equal(agents.match(/dashild:skill:begin/g)?.length, 1);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("skill install is idempotent and keeps the AGENTS block single", () => {
  const cwd = project();

  try {
    skillInstall({ cwd, source });
    skillInstall({ cwd, source });

    const agents = readFileSync(join(cwd, "AGENTS.md"), "utf8");
    assert.equal(agents.match(/dashild:skill:begin/g)?.length, 1);
    assert.equal(agents.match(/dashild:skill:end/g)?.length, 1);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("skill install preserves existing AGENTS.md content", () => {
  const cwd = project();

  try {
    writeFileSync(
      join(cwd, "AGENTS.md"),
      "# Project rules\n\nKeep this line.\n",
      "utf8",
    );

    skillInstall({ cwd, source });

    const agents = readFileSync(join(cwd, "AGENTS.md"), "utf8");
    assert.match(agents, /Keep this line\./);
    assert.match(agents, /dashild:skill:begin/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("skill install can target a single agent", () => {
  const cwd = project();

  try {
    const result = skillInstall({ cwd, source, agent: "claude" });

    assert.deepEqual(result.agents, ["claude"]);
    assert.ok(existsSync(join(cwd, ".claude/skills/dashild/SKILL.md")));
    assert.equal(existsSync(join(cwd, ".opencode")), false);

    const agents = readFileSync(join(cwd, "AGENTS.md"), "utf8");
    assert.doesNotMatch(agents, /\.opencode\/skills/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
