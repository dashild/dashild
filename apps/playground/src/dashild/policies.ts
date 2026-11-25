import { definePolicies, type PolicyContext } from "@dashild/core";

import type { SessionUser } from "@/lib/session";

/**
 * Server policies.
 *
 * `organization` is the active organization resolved by the panel (the switcher
 * cookie is validated on the server). Every resource exposed to the panel must
 * have an entry here; without one, the runtime fails closed.
 */

const isAdmin = (ctx: PolicyContext<SessionUser>): boolean =>
  ctx.roles.includes("ADMIN");

export const policies = definePolicies<SessionUser>({
  organizationOf: async (user) => user.organizationId,
  rolesOf: async (user) => user.roles,

  resources: {
    User: {
      scope: (ctx) =>
        ctx.organizationId ? { organizationId: ctx.organizationId } : null,

      can: {
        // A read scope cannot constrain an insert, so creation is explicit.
        create: (ctx, values) =>
          isAdmin(ctx) || values?.organization === ctx.organizationId,
        update: (ctx, values) =>
          isAdmin(ctx) ||
          values?.organization === undefined ||
          values?.organization === "" ||
          values.organization === ctx.organizationId,
        delete: (ctx) => isAdmin(ctx),
      },
    },

    Organization: {
      scope: (ctx) => (ctx.organizationId ? { id: ctx.organizationId } : null),
      can: {
        create: (ctx) => isAdmin(ctx),
        update: (ctx) => isAdmin(ctx),
        delete: (ctx) => isAdmin(ctx),
      },
    },
  },
});
