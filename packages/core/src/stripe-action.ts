import type { ActionContext, ActionHandler } from "./actions.js";
import type { CurrentUser } from "./index.js";
import {
  stripeDashboardUrl,
  type StripeObject,
} from "./stripe-url.js";

export interface StripeActionOptions {
  type: StripeObject;
  /** Field on the model that stores the Stripe id. */
  field?: string;
  mode?: "test" | "live";
}

function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/**
 * Action handler that opens the current record in the Stripe dashboard.
 *
 * The resource must declare the action and the Stripe id must live on the
 * record (`stripeCustomerId` by default). It runs with the scoped client, so a
 * record outside the policy scope is not readable.
 */
export function stripeActionHandler<TUser extends CurrentUser = CurrentUser>(
  options: StripeActionOptions,
): ActionHandler<TUser> {
  const field = options.field ?? "stripeCustomerId";

  return async (context: ActionContext<TUser>) => {
    if (!context.id) {
      return { ok: false, message: "Missing record id." };
    }

    const db = context.db as
      | Record<
          string,
          {
            findUnique(args: {
              where: { id: string };
              select: Record<string, true>;
            }): Promise<Record<string, unknown> | null>;
          }
        >
      | undefined;

    const delegate = db?.[delegateName(context.resource.model)];
    if (!delegate) {
      return { ok: false, message: "Database client unavailable." };
    }

    const record = await delegate.findUnique({
      where: { id: context.id },
      select: { [field]: true },
    });
    const id = record?.[field];

    if (typeof id !== "string" || id.trim() === "") {
      return {
        ok: false,
        message: `No Stripe id in ${field} for this record.`,
      };
    }

    return {
      ok: true,
      href: stripeDashboardUrl({
        type: options.type,
        id,
        mode: options.mode,
      }),
    };
  };
}
