import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  CurrentUser,
  PoliciesDefinition,
  ResourceDefinition,
} from "../src/index.js";
import { hasRole } from "../src/index.js";
import {
  canPerform,
  resolvePolicy,
  withScope,
} from "../src/server.js";

const user: CurrentUser = { id: "user-1" };

const policies: PoliciesDefinition = {
  organizationOf: async () => "org-1",
  rolesOf: async () => ["USER"],
  resources: {
    User: {
      scope: () => ({ organizationId: "org-1" }),
      can: { delete: () => false },
    },
    Organization: {
      scope: () => null,
    },
  },
};

const resource = (
  policy: ResourceDefinition["policy"] | null = { scope: "organization" },
): ResourceDefinition => ({
  model: "User",
  navigation: { label: "Users", slug: "users" },
  table: { columns: [] },
  form: { fields: [] },
  ...(policy ? { policy } : {}),
});

test("policy: a resource without a policy fails closed", async () => {
  const result = await resolvePolicy(resource(null), policies, user);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "no-policy");
});

test("policy: a missing resource entry fails closed", async () => {
  const ghost = { ...resource(), model: "Ghost" };
  const result = await resolvePolicy(ghost, policies, user);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "no-resource-policy");
});

test("policy: a scope returning null denies the resource", async () => {
  const organization = { ...resource(), model: "Organization" };
  const result = await resolvePolicy(organization, policies, user);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "scope-denied");
});

test("policy: resolves context, scope and can", async () => {
  const result = await resolvePolicy(resource(), policies, user);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.policy.where, { organizationId: "org-1" });
  assert.equal(result.policy.context.organizationId, "org-1");
  assert.deepEqual(result.policy.context.roles, ["USER"]);
});

test("can: explicit predicate, scoped create and default update", async () => {
  const result = await resolvePolicy(resource(), policies, user);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(await canPerform(result.policy, "delete"), false);
  // A scoped resource cannot create without an explicit can.create.
  assert.equal(await canPerform(result.policy, "create"), false);
  assert.equal(await canPerform(result.policy, "update"), true);
});

test("can: explicit create predicate wins", async () => {
  const withCreate: PoliciesDefinition = {
    ...policies,
    resources: {
      ...policies.resources,
      User: {
        ...policies.resources.User,
        can: { create: (_ctx, values) => values?.organization === "org-1" },
      },
    },
  };

  const result = await resolvePolicy(resource(), withCreate, user);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(
    await canPerform(result.policy, "create", { organization: "org-1" }),
    true,
  );
  assert.equal(
    await canPerform(result.policy, "create", { organization: "org-2" }),
    false,
  );
});

test("policy: roles and organization fall back to the user", async () => {
  const direct: PoliciesDefinition = {
    resources: { User: { scope: () => ({}) } },
  };
  const scopedUser: CurrentUser = {
    id: "user-2",
    organizationId: "org-2",
    roles: ["ADMIN"],
  };

  const result = await resolvePolicy(resource(), direct, scopedUser);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.policy.context.organizationId, "org-2");
  assert.deepEqual(result.policy.context.roles, ["ADMIN"]);
});

test("hasRole checks any of the given roles", () => {
  assert.equal(hasRole({ roles: ["ADMIN"] }, "ADMIN"), true);
  assert.equal(hasRole({ roles: ["USER"] }, "ADMIN", "USER"), true);
  assert.equal(hasRole({ roles: ["USER"] }, "ADMIN"), false);
});

test("withScope merges without losing either side", () => {
  assert.deepEqual(withScope({}, { organizationId: "org-1" }), {
    organizationId: "org-1",
  });
  assert.deepEqual(withScope({ name: "Ana" }, {}), { name: "Ana" });
  assert.deepEqual(
    withScope({ name: "Ana" }, { organizationId: "org-1" }),
    { AND: [{ organizationId: "org-1" }, { name: "Ana" }] },
  );
});
