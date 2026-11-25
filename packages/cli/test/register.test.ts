import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { registerResource } from "../src/register.js";

const panel = `import { definePanel } from "@dashild/core";

export const panel = definePanel({
  title: "Admin",
  path: "/admin",
  resources: [],
  auth: {},
});
`;

const policies = `import { definePolicies } from "@dashild/core";

export const policies = definePolicies({
  resources: {},
});
`;

function fixture(panelSource = panel, policiesSource = policies) {
  const directory = mkdtempSync(join(tmpdir(), "dashild-register-"));
  mkdirSync(join(directory, "resources"), { recursive: true });
  const panelPath = join(directory, "panel.ts");
  const policiesPath = join(directory, "policies.ts");
  const resourceFile = join(directory, "resources/customer.ts");
  writeFileSync(panelPath, panelSource, "utf8");
  writeFileSync(policiesPath, policiesSource, "utf8");
  writeFileSync(
    resourceFile,
    'export const customerResource = { model: "Customer" };\n',
    "utf8",
  );
  return { directory, panelPath, policiesPath, resourceFile };
}

test("register: adds the import, the resource and a fail-closed policy", () => {
  const f = fixture();

  try {
    const result = registerResource({
      panelPath: f.panelPath,
      policiesPath: f.policiesPath,
      resourceFile: f.resourceFile,
      exportName: "customerResource",
      model: "Customer",
    });

    assert.equal(result.panelUpdated, true);
    assert.equal(result.policiesUpdated, true);

    const panelSource = readFileSync(f.panelPath, "utf8");
    assert.match(
      panelSource,
      /import \{ customerResource \} from ".\/resources\/customer";/,
    );
    assert.match(panelSource, /resources: \[/);
    assert.match(panelSource, /customerResource/);

    const policySource = readFileSync(f.policiesPath, "utf8");
    assert.match(policySource, /Customer: \{/);
    assert.match(policySource, /scope: \(\) => null/);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test("register: keeps existing resources and policies", () => {
  const panelSource = `import { definePanel } from "@dashild/core";
import { userResource } from "./resources/user";

export const panel = definePanel({
  resources: [userResource],
});
`;
  const policySource = `import { definePolicies } from "@dashild/core";

export const policies = definePolicies({
  resources: {
    User: { scope: () => ({}) },
  },
});
`;
  const f = fixture(panelSource, policySource);

  try {
    registerResource({
      panelPath: f.panelPath,
      policiesPath: f.policiesPath,
      resourceFile: f.resourceFile,
      exportName: "customerResource",
      model: "Customer",
    });

    const nextPanel = readFileSync(f.panelPath, "utf8");
    assert.match(nextPanel, /userResource, customerResource/);
    assert.match(
      nextPanel,
      /import \{ customerResource \} from ".\/resources\/customer";/,
    );

    const nextPolicies = readFileSync(f.policiesPath, "utf8");
    assert.match(nextPolicies, /User: \{ scope: \(\) => \(\{\}\) \},/);
    assert.match(nextPolicies, /Customer: \{/);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test("register: is idempotent", () => {
  const f = fixture();

  try {
    const input = {
      panelPath: f.panelPath,
      policiesPath: f.policiesPath,
      resourceFile: f.resourceFile,
      exportName: "customerResource",
      model: "Customer",
    };

    registerResource(input);
    const panelAfterFirst = readFileSync(f.panelPath, "utf8");
    const policiesAfterFirst = readFileSync(f.policiesPath, "utf8");

    const second = registerResource(input);
    assert.equal(second.panelUpdated, false);
    assert.equal(second.policiesUpdated, false);
    assert.equal(readFileSync(f.panelPath, "utf8"), panelAfterFirst);
    assert.equal(readFileSync(f.policiesPath, "utf8"), policiesAfterFirst);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test("register: missing panel or policies is a warning, not a crash", () => {
  const f = fixture();

  try {
    rmSync(f.panelPath);
    rmSync(f.policiesPath);

    const result = registerResource({
      panelPath: f.panelPath,
      policiesPath: f.policiesPath,
      resourceFile: f.resourceFile,
      exportName: "customerResource",
      model: "Customer",
    });

    assert.equal(result.panelUpdated, false);
    assert.equal(result.policiesUpdated, false);
    assert.equal(result.warnings.length, 2);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});
