import "dotenv/config";

import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

const PASSWORD = "dashild123";

async function reset() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await reset();

  for (const person of [
    { email: "ana@shop.test", name: "Ana Torres" },
    { email: "bruno@shop.test", name: "Bruno Díaz" },
  ]) {
    const created = await auth.api.signUpEmail({
      body: { ...person, password: PASSWORD },
    });
    if (!created.user) throw new Error("Better Auth did not create " + person.email);
  }

  const coffee = await prisma.category.create({
    data: { name: "Coffee", slug: "coffee" },
  });
  const equipment = await prisma.category.create({
    data: { name: "Equipment", slug: "equipment" },
  });

  const roasters = await prisma.supplier.create({
    data: { name: "Acme Roasters", email: "orders@acme-roasters.test" },
  });
  const brewing = await prisma.supplier.create({
    data: { name: "Brew Supply", email: "sales@brew.test" },
  });

  const beans = await prisma.product.create({
    data: {
      name: "Espresso beans 1kg",
      sku: "BEANS-1K",
      description: "Medium roast, chocolate and hazelnut.",
      price: "18.50",
      stock: 24,
      categoryId: coffee.id,
      supplierId: roasters.id,
    },
  });
  const filter = await prisma.product.create({
    data: {
      name: "Paper filters 100",
      sku: "FILTER-100",
      price: "4.90",
      stock: 120,
      categoryId: equipment.id,
      supplierId: brewing.id,
    },
  });
  const grinder = await prisma.product.create({
    data: {
      name: "Hand grinder",
      sku: "GRINDER-01",
      price: "39.00",
      stock: 8,
      categoryId: equipment.id,
      supplierId: brewing.id,
    },
  });

  const lucia = await prisma.customer.create({
    data: { name: "Lucía Fernández", email: "lucia@example.com" },
  });
  const marcos = await prisma.customer.create({
    data: { name: "Marcos Gil", email: "marcos@example.com" },
  });

  const orders = [
    {
      number: "SO-1001",
      customerId: lucia.id,
      status: "PAID" as const,
      total: "23.40",
      items: [
        { productId: beans.id, quantity: 1, unitPrice: "18.50" },
        { productId: filter.id, quantity: 1, unitPrice: "4.90" },
      ],
    },
    {
      number: "SO-1002",
      customerId: marcos.id,
      status: "PENDING" as const,
      total: "78.00",
      items: [{ productId: grinder.id, quantity: 2, unitPrice: "39.00" }],
    },
    {
      number: "SO-1003",
      customerId: lucia.id,
      status: "SHIPPED" as const,
      total: "18.50",
      items: [{ productId: beans.id, quantity: 1, unitPrice: "18.50" }],
    },
  ];

  for (const order of orders) {
    const { items, ...data } = order;
    await prisma.order.create({
      data: { ...data, items: { create: items } },
    });
  }

  const [users, products, orderCount, itemCount] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
  ]);

  console.log(
    "seed:",
    users,
    "users,",
    products,
    "products,",
    orderCount,
    "orders,",
    itemCount,
    "items",
  );
  console.log("login: ana@shop.test / " + PASSWORD);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
