import { definePolicies, type CurrentUser } from "@dashild/core";

/**
 * Every signed-in staff member manages the shop. Add roles and predicates when
 * the team needs finer permissions.
 */
export const policies = definePolicies<CurrentUser>({
  resources: {
    Category: {
      scope: () => ({}),
      can: { create: () => true, update: () => true, delete: () => true },
    },
    Supplier: {
      scope: () => ({}),
      can: { create: () => true, update: () => true, delete: () => true },
    },
    Customer: {
      scope: () => ({}),
      can: { create: () => true, update: () => true, delete: () => true },
    },
    Product: {
      scope: () => ({}),
      can: {
        create: () => true,
        update: () => true,
        delete: () => true,
        restock: () => true,
      },
    },
    Order: {
      scope: () => ({}),
      can: {
        create: () => true,
        update: () => true,
        delete: () => true,
        markPaid: () => true,
        ship: () => true,
        cancelOrder: () => true,
      },
    },
    OrderItem: {
      scope: () => ({}),
      can: { create: () => true, update: () => true, delete: () => true },
    },
  },
});
