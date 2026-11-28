import type { ActionHandler, CurrentUser } from "@dashild/core";

type OrderStatus = "PAID" | "SHIPPED" | "CANCELLED";

interface ScopedClient {
  product: {
    update(args: {
      where: { id: string };
      data: { stock: { increment: number } };
    }): Promise<unknown>;
  };
  order: {
    update(args: {
      where: { id: string };
      data: { status: OrderStatus };
    }): Promise<unknown>;
  };
}

function dbFrom(context: Parameters<ActionHandler<CurrentUser>>[0]) {
  return context.db as ScopedClient | undefined;
}

async function setOrderStatus(
  context: Parameters<ActionHandler<CurrentUser>>[0],
  status: OrderStatus,
) {
  if (!context.id) return { ok: false, message: "Missing order id." };
  const db = dbFrom(context);
  if (!db) return { ok: false, message: "Database client unavailable." };

  await db.order.update({ where: { id: context.id }, data: { status } });

  return { ok: true, message: `Order ${status.toLowerCase()}.` };
}

export const resourceActions: Record<
  string,
  Record<string, ActionHandler<CurrentUser>>
> = {
  Product: {
    restock: async (context) => {
      if (!context.id) return { ok: false, message: "Missing product id." };
      const db = dbFrom(context);
      if (!db) return { ok: false, message: "Database client unavailable." };

      const amount = Number(context.data?.amount ?? 10);
      await db.product.update({
        where: { id: context.id },
        data: { stock: { increment: Number.isFinite(amount) ? amount : 10 } },
      });

      return { ok: true, message: `Stock increased by ${amount}.` };
    },
  },
  Order: {
    markPaid: (context) => setOrderStatus(context, "PAID"),
    ship: (context) => setOrderStatus(context, "SHIPPED"),
    cancelOrder: (context) => setOrderStatus(context, "CANCELLED"),
  },
};
