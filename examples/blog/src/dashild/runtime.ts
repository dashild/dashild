// dashild:generated 0.1.0-alpha.12
import type { DashildMetadata } from "@dashild/core";
import { createDashildRuntime } from "@dashild/core/server";

import metadataJson from "../generated/dashild/dashild-metadata.json";
import { prisma } from "../lib/prisma";

import { resourceActions } from "./actions";
import { panel } from "./panel";
import { policies } from "./policies";

const metadata = metadataJson as unknown as DashildMetadata;

/**
 * App runtime.
 *
 * The generic query and write logic lives in @dashild/core/server. This file
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
