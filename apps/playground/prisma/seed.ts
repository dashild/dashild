import "dotenv/config";

import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { Role } from "../src/generated/prisma/enums";

/**
 * Datos de la app de ejemplo.
 *
 * Crea las cuentas con Better Auth (email + contraseña), no a mano: el hash y
 * el registro en `Account` los hace la librería. Después completa los campos
 * de dominio (organización, rol, saldo) que el sign-up no acepta.
 *
 * Es un seed de desarrollo: **resetea usuarios y posts** en cada ejecución.
 * Las organizaciones se conservan.
 *
 * Contraseña de todos los usuarios de demo: `dashild123`.
 */

const PASSWORD = "dashild123";

const DEMO_USERS = [
  {
    email: "ana@acme.test",
    name: "Ana Torres",
    organizationId: "org-1",
    role: Role.ADMIN,
    balance: "1250.75",
    bigNumber: 9001n,
    metadata: { theme: "dark", notifications: true },
    bio: "Responsable de operaciones. Este texto viene de un campo @db.Text.",
    isActive: true,
  },
  {
    email: "bruno@beta.test",
    name: "Bruno Díaz",
    organizationId: "org-2",
    role: Role.USER,
    balance: "0.00",
    bigNumber: 42n,
    metadata: undefined,
    bio: undefined,
    isActive: true,
  },
  {
    email: "carla@acme.test",
    name: "Carla Ruiz",
    organizationId: "org-1",
    role: Role.USER,
    balance: "999.99",
    bigNumber: 7n,
    metadata: undefined,
    bio: undefined,
    isActive: false,
  },
] as const;

async function seedOrganizations() {
  for (const organization of [
    { id: "org-1", name: "Acme" },
    { id: "org-2", name: "Beta" },
  ]) {
    await prisma.organization.upsert({
      where: { id: organization.id },
      update: { name: organization.name },
      create: organization,
    });
  }
}

async function resetDemoData() {
  // Orden por claves foráneas. Solo datos de demo; las organizaciones quedan.
  await prisma.post.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  const users = new Map<string, { id: string }>();

  for (const demo of DEMO_USERS) {
    const created = await auth.api.signUpEmail({
      body: {
        email: demo.email,
        password: PASSWORD,
        name: demo.name,
      },
    });

    if (!created.user) {
      throw new Error(`Better Auth no creó el usuario ${demo.email}`);
    }

    const user = await prisma.user.update({
      where: { id: created.user.id },
      data: {
        organizationId: demo.organizationId,
        role: demo.role,
        balance: demo.balance,
        bigNumber: demo.bigNumber,
        metadata: demo.metadata,
        bio: demo.bio,
        isActive: demo.isActive,
      },
    });

    users.set(demo.email, user);
  }

  return users;
}

async function seedPosts(users: Map<string, { id: string }>) {
  const ana = users.get("ana@acme.test");
  const bruno = users.get("bruno@beta.test");
  if (!ana || !bruno) throw new Error("Faltan usuarios para sembrar posts.");

  const posts = [
    {
      title: "Bienvenida al panel",
      published: true,
      tags: ["dashild", "next"],
      authorId: ana.id,
    },
    {
      title: "Notas internas de Acme",
      published: false,
      tags: ["interno"],
      authorId: ana.id,
    },
    {
      title: "Notas de Beta",
      published: true,
      tags: [],
      authorId: bruno.id,
    },
  ];

  for (const post of posts) {
    const existing = await prisma.post.findFirst({
      where: { title: post.title },
    });
    if (!existing) await prisma.post.create({ data: post });
  }
}

async function seedLabels(users: Map<string, { id: string }>) {
  const names = ["Alpha", "Beta", "Gamma"];
  const labels = [];
  for (const name of names) {
    labels.push(
      await prisma.label.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    );
  }

  const ana = users.get("ana@acme.test");
  const carla = users.get("carla@acme.test");
  if (ana) {
    await prisma.user.update({
      where: { id: ana.id },
      data: {
        labels: {
          set: labels
            .filter((label) => label.name !== "Gamma")
            .map((label) => ({ id: label.id })),
        },
      },
    });
  }
  if (carla) {
    await prisma.user.update({
      where: { id: carla.id },
      data: { labels: { set: [{ id: labels[0]!.id }] } },
    });
  }
}

async function main() {
  await seedOrganizations();
  await resetDemoData();
  const users = await seedUsers();
  await seedPosts(users);
  await seedLabels(users);

  const [organizations, accounts, sessions, posts] = await Promise.all([
    prisma.organization.count(),
    prisma.account.count(),
    prisma.session.count(),
    prisma.post.count(),
  ]);

  console.log(
    `seed: ${organizations} organizaciones, ${users.size} usuarios, ${accounts} cuentas, ${sessions} sesiones, ${posts} posts`,
  );
  console.log(`login: ana@acme.test / ${PASSWORD}`);
}

await main();
await prisma.$disconnect();
