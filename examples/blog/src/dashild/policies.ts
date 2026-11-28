import {
  definePolicies,
  hasRole,
  type CurrentUser,
} from "@dashild/core";

const isAdmin = (ctx: { roles: string[] }) => hasRole(ctx, "ADMIN");

/**
 * Authors only see and edit their own posts and the comments on them.
 * Admins see everything and manage categories, tags and staff.
 */
export const policies = definePolicies<CurrentUser>({
  resources: {
    Post: {
      scope: (ctx) => (isAdmin(ctx) ? {} : { authorId: ctx.user.id }),
      can: {
        create: () => true,
        update: () => true,
        delete: isAdmin,
        publish: () => true,
        unpublish: () => true,
      },
    },
    Category: {
      scope: () => ({}),
      can: { create: isAdmin, update: isAdmin, delete: isAdmin },
    },
    Tag: {
      scope: () => ({}),
      can: { create: isAdmin, update: isAdmin, delete: isAdmin },
    },
    Comment: {
      scope: (ctx) =>
        isAdmin(ctx) ? {} : { post: { authorId: ctx.user.id } },
      can: {
        create: () => true,
        update: () => true,
        delete: isAdmin,
        approve: () => true,
        unapprove: () => true,
      },
    },
    User: {
      scope: () => ({}),
      can: { create: () => false, update: isAdmin, delete: () => false },
    },
  },
});
