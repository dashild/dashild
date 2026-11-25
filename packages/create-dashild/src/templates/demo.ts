import type { LoadedTemplate } from "../types.js";

const manifest = {
  name: "demo",
  version: "0.1.0",
  description: "Users, posts and labels with relation managers",
  dashild: ">=0.1.0-alpha.2",
  prisma: { provider: ["postgresql", "mysql", "sqlite"] as const },
  requires: { auth: ["better-auth"] as const },
  extend: {
    User: [
      "role     Role      @default(USER)",
      "posts    Post[]",
      "labels   Label[]",
    ],
  },
};

const files = new Map<string, string>([
  [
    "prisma/models.prisma",
    `enum Role {
  ADMIN
  USER
}

model Post {
  id        String   @id @default(uuid())
  title     String
  body      String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
}

model Label {
  id    String @id @default(uuid())
  name  String @unique
  users User[]
}
`,
  ],
  [
    "src/dashild/resources/user.ts",
    `import { defineResource } from "@dashild/core";

export const userResource = defineResource({
  model: "User",

  navigation: {
    label: "Users",
    slug: "users",
    group: "Demo",
  },

  table: {
    searchable: ["name", "email"],
    pageSize: 25,
    columns: [
      { field: "name", label: "Name", sortable: true },
      { field: "email", label: "Email", sortable: true },
      {
        field: "role",
        label: "Role",
        format: "badge",
        tone: { ADMIN: "accent", USER: "muted" },
      },
      {
        field: "createdAt",
        label: "Created",
        format: "datetime",
        sortable: true,
      },
    ],
  },

  form: {
    fields: [
      {
        field: "name",
        type: "text",
        label: "Name",
        rules: { required: true },
      },
    ],
  },
});
`,
  ],
  [
    "src/dashild/resources/post.ts",
    `import { defineResource } from "@dashild/core";

export const postResource = defineResource({
  model: "Post",

  navigation: {
    label: "Posts",
    slug: "posts",
    group: "Demo",
  },

  table: {
    searchable: ["title"],
    pageSize: 25,
    columns: [
      { field: "title", label: "Title", sortable: true },
      {
        field: "published",
        label: "Published",
        format: "badge",
        tone: { true: "green", false: "muted" },
      },
      { field: "author", label: "Author", display: "name", sortable: true },
      {
        field: "createdAt",
        label: "Created",
        format: "datetime",
        sortable: true,
      },
    ],
    filters: [
      { field: "published", type: "boolean", label: "Published" },
      { field: "author", type: "relation", label: "Author", display: "name" },
    ],
  },

  form: {
    fields: [
      {
        field: "title",
        type: "text",
        label: "Title",
        rules: { required: true },
      },
      { field: "body", type: "textarea", label: "Body" },
      {
        field: "published",
        type: "boolean",
        label: "Published",
        default: false,
      },
      {
        field: "author",
        type: "relation",
        label: "Author",
        relation: "author",
        display: "name",
        rules: { required: true },
      },
    ],
  },
});
`,
  ],
  [
    "src/dashild/resources/label.ts",
    `import { defineResource } from "@dashild/core";

export const labelResource = defineResource({
  model: "Label",

  navigation: {
    label: "Labels",
    slug: "labels",
    group: "Demo",
  },

  table: {
    searchable: ["name"],
    pageSize: 25,
    columns: [{ field: "name", label: "Name", sortable: true }],
  },

  form: {
    fields: [
      {
        field: "name",
        type: "text",
        label: "Name",
        rules: { required: true },
      },
      {
        field: "users",
        type: "relation",
        label: "Users",
        relation: "users",
        display: "name",
        multiple: true,
      },
    ],
  },
});
`,
  ],
  [
    "src/dashild/policies.ts",
    `import { definePolicies, type CurrentUser } from "@dashild/core";

/**
 * Demo policies.
 *
 * Every signed-in user can manage posts and labels. Replace these with real
 * scopes before shipping the app.
 */
export const policies = definePolicies<CurrentUser>({
  resources: {
    User: {
      scope: () => ({}),
      can: {
        create: () => false,
        update: () => true,
        delete: () => false,
      },
    },
    Post: {
      scope: () => ({}),
      can: {
        create: () => true,
        update: () => true,
        delete: () => true,
      },
    },
    Label: {
      scope: () => ({}),
      can: {
        create: () => true,
        update: () => true,
        delete: () => true,
      },
    },
  },
});
`,
  ],
  [
    "prisma/seed.ts",
    `import "dotenv/config";

import { auth } from "__DASHILD_LIB__/auth";
import { prisma } from "__DASHILD_LIB__/prisma";

const PASSWORD = "dashild123";

async function reset() {
  await prisma.post.deleteMany();
  await prisma.label.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await reset();

  const users = [];
  for (const demo of [
    { email: "ana@acme.test", name: "Ana Torres" },
    { email: "bruno@acme.test", name: "Bruno Díaz" },
    { email: "carla@acme.test", name: "Carla Ruiz" },
  ]) {
    const created = await auth.api.signUpEmail({
      body: { email: demo.email, password: PASSWORD, name: demo.name },
    });
    if (!created.user) {
      throw new Error("Better Auth did not create " + demo.email);
    }
    users.push(created.user);
  }

  const ana = users[0]!;
  const bruno = users[1]!;

  await prisma.post.createMany({
    data: [
      { title: "Welcome to Dashild", published: true, authorId: ana.id },
      { title: "Internal notes", published: false, authorId: ana.id },
      { title: "Bruno's draft", published: true, authorId: bruno.id },
    ],
  });

  const labels = [];
  for (const name of ["Alpha", "Beta", "Gamma"]) {
    labels.push(
      await prisma.label.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    );
  }

  await prisma.user.update({
    where: { id: ana.id },
    data: {
      labels: {
        connect: labels.slice(0, 2).map((label) => ({ id: label.id })),
      },
    },
  });
  await prisma.user.update({
    where: { id: bruno.id },
    data: { labels: { connect: [{ id: labels[0]!.id }] } },
  });

  const [posts, labelCount] = await Promise.all([
    prisma.post.count(),
    prisma.label.count(),
  ]);

  console.log(
    "seed:",
    users.length,
    "users,",
    posts,
    "posts,",
    labelCount,
    "labels",
  );
  console.log("login: ana@acme.test / " + PASSWORD);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
`,
  ],
]);

export const demoTemplate: LoadedTemplate = {
  manifest: {
    ...manifest,
    prisma: { provider: [...manifest.prisma.provider] },
    requires: { auth: [...manifest.requires.auth] },
    extend: { ...manifest.extend },
  },
  files,
  source: "bundled",
};
