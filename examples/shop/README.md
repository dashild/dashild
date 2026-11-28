# Shop (single-tenant example)

Inventory and orders for a small shop: products, stock, suppliers, customers,
orders, and order items. It is generated from the `shop` starter and installed
from npm (`@dashild/*` 0.1.0-alpha.11), never through `workspace:*`.

## Run it

```bash
cp .env.example .env   # set BETTER_AUTH_SECRET if you change the demo
pnpm install
pnpm prisma migrate deploy
pnpm db:seed
pnpm dev
```

Open <http://localhost:3000/admin>. SQLite database at `prisma/dev.db`.

## Sign in

| Email | Password |
| --- | --- |
| `ana@shop.test` | `dashild123` |
| `bruno@shop.test` | `dashild123` |

## What to try

- **Products**: prices are `Decimal` rendered as EUR, stock as a number. The
  “Restock +10” action increments stock and refreshes the table.
- **Orders**: filters by status and customer; “Mark paid”, “Ship”, and “Cancel”
  change the status. Open an order to manage its items (relation manager).
- **Money**: `total` is denormalized in this example; a real checkout would
  update it when items change.
- **Relations**: supplier and category link to products; customers link to
  orders.

## Layout

```text
prisma/schema.prisma                 catalog, customers, orders, items
prisma/seed.ts                       two users, products, orders and items
src/dashild/resources/*.ts           one file per model
src/dashild/policies.ts              authenticated staff manages the shop
src/dashild/actions/index.ts         restock, mark paid, ship, cancel
```

This is the `shop` starter: `pnpm create dashild@latest my-shop --template shop`.
