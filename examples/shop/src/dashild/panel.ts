// dashild:generated 0.1.0-alpha.12
import { definePanel } from "@dashild/core";

import { signOut } from "../lib/auth-actions";
import { getCurrentUser } from "../lib/session";
import { categoryResource } from "./resources/category";
import { customerResource } from "./resources/customer";
import { orderItemResource } from "./resources/order-item";
import { orderResource } from "./resources/order";
import { productResource } from "./resources/product";
import { supplierResource } from "./resources/supplier";

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
    categoryResource,
    customerResource,
    orderItemResource,
    orderResource,
    productResource,
    supplierResource,
  ],
  auth: {
    getCurrentUser,
    signOut,
  },
});
