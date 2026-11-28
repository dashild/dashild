import assert from "node:assert/strict";
import { test } from "node:test";

import type { ActionContext } from "../src/actions.js";
import { stripeDashboardUrl } from "../src/index.js";
import { stripeActionHandler } from "../src/server.js";

test("stripeDashboardUrl builds live and test URLs", () => {
  assert.equal(
    stripeDashboardUrl({ type: "customer", id: "cus_123" }),
    "https://dashboard.stripe.com/customers/cus_123",
  );
  assert.equal(
    stripeDashboardUrl({ type: "subscription", id: "sub 123", mode: "test" }),
    "https://dashboard.stripe.com/test/subscriptions/sub%20123",
  );
  assert.equal(
    stripeDashboardUrl({ type: "invoice", id: "in_123", mode: "live" }),
    "https://dashboard.stripe.com/invoices/in_123",
  );
});

test("stripeActionHandler opens the record in the dashboard", async () => {
  const handler = stripeActionHandler({ type: "customer", mode: "test" });
  const calls: unknown[] = [];

  const result = await handler({
    resource: { model: "Customer" },
    user: { id: "user-1" },
    id: "record-1",
    db: {
      customer: {
        findUnique: async (args: unknown) => {
          calls.push(args);
          return { stripeCustomerId: "cus_123" };
        },
      },
    },
  } as unknown as ActionContext);

  assert.equal(result.ok, true);
  assert.equal(
    result.href,
    "https://dashboard.stripe.com/test/customers/cus_123",
  );
  assert.deepEqual(calls, [
    {
      where: { id: "record-1" },
      select: { stripeCustomerId: true },
    },
  ]);
});

test("stripeActionHandler supports a custom field and reports missing ids", async () => {
  const handler = stripeActionHandler({
    type: "subscription",
    field: "stripeSubscriptionId",
  });

  const missing = await handler({
    resource: { model: "Customer" },
    user: { id: "user-1" },
    id: "record-1",
    db: {
      customer: {
        findUnique: async () => ({ stripeSubscriptionId: null }),
      },
    },
  } as unknown as ActionContext);

  assert.equal(missing.ok, false);
  assert.match(missing.message ?? "", /No Stripe id/);

  const noRecord = await stripeActionHandler({ type: "customer" })({
    resource: { model: "Customer" },
    user: { id: "user-1" },
    id: "record-1",
    db: { customer: { findUnique: async () => null } },
  } as unknown as ActionContext);

  assert.equal(noRecord.ok, false);

  const noId = await stripeActionHandler({ type: "customer" })({
    resource: { model: "Customer" },
    user: { id: "user-1" },
    db: { customer: { findUnique: async () => null } },
  } as unknown as ActionContext);

  assert.equal(noId.ok, false);
  assert.match(noId.message ?? "", /Missing record id/);
});
