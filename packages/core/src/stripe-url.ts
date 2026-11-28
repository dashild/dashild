/** Stripe objects with a dashboard page. */
export type StripeObject =
  | "customer"
  | "subscription"
  | "invoice"
  | "payment"
  | "product"
  | "price";

const PATHS: Record<StripeObject, string> = {
  customer: "customers",
  subscription: "subscriptions",
  invoice: "invoices",
  payment: "payments",
  product: "products",
  price: "prices",
};

/**
 * Builds a Stripe dashboard URL from an object id.
 *
 * Dashild does not call the Stripe API; this only links to the object the app
 * already synced. There is no key, webhook, or network request involved.
 */
export function stripeDashboardUrl(options: {
  type: StripeObject;
  id: string;
  mode?: "test" | "live";
}): string {
  const prefix = options.mode === "test" ? "/test" : "";
  return `https://dashboard.stripe.com${prefix}/${PATHS[options.type]}/${encodeURIComponent(
    options.id,
  )}`;
}
