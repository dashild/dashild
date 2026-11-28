// dashild:generated 0.1.0-alpha.12
import { definePanel } from "@dashild/core";

import { signOut } from "../lib/auth-actions";
import { getCurrentUser } from "../lib/session";
import { postResource } from "./resources/post";
import { categoryResource } from "./resources/category";
import { tagResource } from "./resources/tag";
import { commentResource } from "./resources/comment";
import { staffResource } from "./resources/staff";

/**
 * Panel configuration.
 *
 * Better Auth is wired in lib/auth.ts. The other packages never import it:
 * the panel only needs getCurrentUser and signOut.
 */
export const panel = definePanel({
  title: "Admin",
  path: "/admin",
  locale: "en",
  resources: [
    postResource,
    categoryResource,
    tagResource,
    commentResource,
    staffResource,
  ],
  auth: {
    getCurrentUser,
    signOut,
  },
});
