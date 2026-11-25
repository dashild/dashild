import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  CurrentUser,
  PoliciesDefinition,
  ResourceDefinition,
} from "../src/index.js";
import { withDashildScope, PolicyDeniedError } from "../src/server.js";

const user: CurrentUser = { id: "user-1" };

const resource = {
  model: "User",
  navigation: { label: "Users", slug: "users" },
  policy: { scope: "organization" },
  table: { columns: [] },
  form: { fields: [] },
} as ResourceDefinition;

const policies: PoliciesDefinition<CurrentUser> = {
  organizationOf: async () => "org-1",
  resources: {
    User: {
      scope: (ctx) => ({ organizationId: ctx.organizationId }),
    },
  },
};

function extension() {
  return withDashildScope({
    resources: [resource],
    policies,
    user,
  });
}

async function run(
  operation: string,
  args: Record<string, unknown>,
  model = "User",
) {
  return extension().query.$allModels.$allOperations({
    model,
    operation,
    args,
    query: async (next) => next,
  });
}

test("scope extension: findMany merges with AND", async () => {
  const result = (await run("findMany", {
    where: { name: "Ana" },
  })) as { where: unknown };

  assert.deepEqual(result.where, {
    AND: [{ organizationId: "org-1" }, { name: "Ana" }],
  });
});

test("scope extension: findUnique keeps the unique field at top level", async () => {
  const result = (await run("findUnique", {
    where: { email: "ana@example.test" },
  })) as { where: unknown };

  assert.deepEqual(result.where, {
    email: "ana@example.test",
    organizationId: "org-1",
  });
});

test("scope extension: update and delete merge the unique where", async () => {
  for (const operation of ["update", "delete"]) {
    const result = (await run(operation, {
      where: { id: "user-2" },
    })) as { where: unknown };

    assert.deepEqual(result.where, {
      id: "user-2",
      organizationId: "org-1",
    });
  }
});

test("scope extension: models without a resource pass through", async () => {
  const args = { where: { id: "x" } };
  const result = await run("findMany", args, "Post");
  assert.equal(result, args);
});

test("scope extension: a resource without a policy fails closed", async () => {
  const noPolicy = withDashildScope({
    resources: [resource],
    policies: { resources: {} },
    user,
  });

  await assert.rejects(
    noPolicy.query.$allModels.$allOperations({
      model: "User",
      operation: "findMany",
      args: {},
      query: async (next) => next,
    }),
    PolicyDeniedError,
  );
});

test("scope extension: create is not scoped but remains the caller's job", async () => {
  const args = { data: { name: "Ana" } };
  const result = await run("create", args);
  assert.equal(result, args);
});
