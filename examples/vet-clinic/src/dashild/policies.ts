import {
  definePolicies,
  hasRole,
  type CurrentUser,
} from "@dashild/core";

const orgScope = (ctx: { organizationId: string | null }) =>
  ctx.organizationId ? { organizationId: ctx.organizationId } : null;

const admin = (ctx: { roles: string[] }) => hasRole(ctx, "ADMIN");
const clinical = (ctx: { roles: string[] }) =>
  hasRole(ctx, "ADMIN", "VET");
const staff = (ctx: { roles: string[] }) =>
  hasRole(ctx, "ADMIN", "VET", "RECEPTION");

/**
 * Every resource is scoped to the active clinic. A session without an
 * organization (for example, right after sign-up) sees nothing.
 */
export const policies = definePolicies<CurrentUser>({
  resources: {
    Owner: {
      scope: orgScope,
      can: { create: staff, update: staff, delete: admin },
    },
    Pet: {
      scope: orgScope,
      can: { create: staff, update: staff, delete: admin },
    },
    Appointment: {
      scope: orgScope,
      can: {
        create: staff,
        update: staff,
        delete: admin,
        attend: clinical,
        cancelAppointment: (ctx) => hasRole(ctx, "ADMIN", "RECEPTION"),
      },
    },
    Visit: {
      scope: orgScope,
      can: { create: clinical, update: clinical, delete: admin },
    },
    Vaccination: {
      scope: orgScope,
      can: { create: clinical, update: clinical, delete: admin },
    },
    User: {
      scope: orgScope,
      can: { create: () => false, update: admin, delete: () => false },
    },
  },
});
