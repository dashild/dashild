import { createDashildRuntime } from "@dashild/core/server";

import { prisma } from "@/lib/prisma";

import { resourceActions } from "./actions";
import { panel } from "./panel";
import { policies } from "./policies";
import { metadata } from "./server/metadata";

/**
 * App runtime.
 *
 * The generic query and write logic lives in `@dashild/core/server`. This file
 * only wires the app's Prisma client, metadata, policies and action handlers.
 */
export const runtime = createDashildRuntime({
  prisma,
  metadata,
  resources: panel.resources,
  policies,
  locale: panel.locale,
  actions: resourceActions,
});
