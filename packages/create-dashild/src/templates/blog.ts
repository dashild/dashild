import type { LoadedTemplate } from "../types.js";

const manifest = {
  name: "blog",
  version: "0.1.0",
  description: "Posts, categories, tags, comments and an editorial workflow",
  dashild: ">=0.1.0-alpha.11",
  prisma: { provider: ["postgresql", "mysql", "sqlite"] as const },
  requires: { auth: ["better-auth"] as const, tenancy: false },
  overwrite: ["src/lib/session.ts", "src/dashild/actions/index.ts"],
  extend: {
    User: ["role Role @default(AUTHOR)", "posts Post[]"],
  },
};

const files = new Map<string, string>([
  [
    "src/lib/session.ts",
    `import { headers } from "next/headers";

import { auth } from "./auth";
import { prisma } from "./prisma";

/** Signed-in staff with the blog role resolved from the database. */
export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const record = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    roles: record?.role ? [record.role] : [],
  };
}
`,
  ],
  [
    "prisma/models.prisma",
    `enum Role {
  ADMIN
  AUTHOR
}

enum PostStatus {
  DRAFT
  REVIEW
  PUBLISHED
}

model Category {
  id    String @id @default(uuid())
  name  String @unique
  slug  String @unique
  posts Post[]
}

model Tag {
  id    String @id @default(uuid())
  name  String @unique
  slug  String @unique
  posts Post[]
}

model Post {
  id          String     @id @default(uuid())
  title       String
  slug        String     @unique
  excerpt     String?
  body        String
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?
  cover       Bytes?
  authorId    String
  author      User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  categoryId  String?
  category    Category?  @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  tags        Tag[]
  comments    Comment[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([authorId])
  @@index([status])
}

model Comment {
  id         String   @id @default(uuid())
  authorName String
  body       String
  approved   Boolean  @default(false)
  postId     String
  post       Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@index([postId])
}
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
    group: "Content",
    icon: "file-text",
  },

  table: {
    searchable: ["title", "excerpt"],
    pageSize: 25,
    columns: [
      { field: "title", label: "Title", sortable: true },
      {
        field: "status",
        label: "Status",
        format: "badge",
        tone: { DRAFT: "muted", REVIEW: "accent", PUBLISHED: "green" },
      },
      { field: "category", label: "Category", display: "name", sortable: true },
      { field: "author", label: "Author", display: "name", sortable: true },
      {
        field: "publishedAt",
        label: "Published",
        format: "datetime",
        sortable: true,
      },
    ],
    filters: [
      { field: "status", type: "enum", label: "Status" },
      { field: "category", type: "relation", label: "Category", display: "name" },
      { field: "author", type: "relation", label: "Author", display: "name" },
    ],
    actions: [
      { name: "create", placement: "header" },
      { name: "view", placement: "row" },
      { name: "edit", placement: "row" },
      { name: "delete", placement: "row" },
      {
        name: "publish",
        label: "Publish",
        placement: "row",
        requires: "publish",
        variant: "secondary",
      },
      {
        name: "unpublish",
        label: "Unpublish",
        placement: "row",
        requires: "unpublish",
        confirm: true,
      },
    ],
  },

  form: {
    fields: [
      { field: "title", type: "text", rules: { required: true } },
      { field: "slug", type: "text", rules: { required: true } },
      { field: "excerpt", type: "textarea" },
      { field: "body", type: "textarea", rules: { required: true } },
      { field: "status", type: "select" },
      { field: "publishedAt", type: "datetime" },
      {
        field: "author",
        type: "relation",
        relation: "author",
        display: "name",
        rules: { required: true },
      },
      {
        field: "category",
        type: "relation",
        relation: "category",
        display: "name",
      },
      {
        field: "tags",
        type: "relation",
        relation: "tags",
        display: "name",
        multiple: true,
      },
      { field: "cover", type: "bytes" },
    ],
  },

  policy: { scope: "author" },
});
`,
  ],
  [
    "src/dashild/resources/category.ts",
    `import { defineResource } from "@dashild/core";

export const categoryResource = defineResource({
  model: "Category",
  navigation: {
    label: "Categories",
    slug: "categories",
    group: "Content",
    icon: "tag",
  },
  table: {
    searchable: ["name"],
    columns: [
      { field: "name", sortable: true },
      { field: "slug", sortable: true },
    ],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      { field: "slug", type: "text", rules: { required: true } },
    ],
  },
  policy: { scope: "public" },
});
`,
  ],
  [
    "src/dashild/resources/tag.ts",
    `import { defineResource } from "@dashild/core";

export const tagResource = defineResource({
  model: "Tag",
  navigation: {
    label: "Tags",
    slug: "tags",
    group: "Content",
    icon: "tag",
  },
  table: {
    searchable: ["name"],
    columns: [
      { field: "name", sortable: true },
      { field: "slug", sortable: true },
    ],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      { field: "slug", type: "text", rules: { required: true } },
    ],
  },
  policy: { scope: "public" },
});
`,
  ],
  [
    "src/dashild/resources/comment.ts",
    `import { defineResource } from "@dashild/core";

export const commentResource = defineResource({
  model: "Comment",
  navigation: {
    label: "Comments",
    slug: "comments",
    group: "Moderation",
    icon: "mail",
  },
  table: {
    searchable: ["authorName", "body"],
    columns: [
      { field: "authorName", label: "Author", sortable: true },
      { field: "post", label: "Post", display: "title", sortable: true },
      {
        field: "approved",
        label: "Approved",
        format: "badge",
        tone: { true: "green", false: "muted" },
      },
      { field: "createdAt", format: "datetime", sortable: true },
    ],
    filters: [
      { field: "approved", type: "boolean", label: "Approved" },
      { field: "post", type: "relation", label: "Post", display: "title" },
    ],
    actions: [
      { name: "create", placement: "header" },
      { name: "view", placement: "row" },
      { name: "edit", placement: "row" },
      { name: "delete", placement: "row" },
      {
        name: "approve",
        label: "Approve",
        placement: "row",
        requires: "approve",
        variant: "secondary",
      },
      {
        name: "unapprove",
        label: "Unapprove",
        placement: "row",
        requires: "unapprove",
        confirm: true,
      },
    ],
  },
  form: {
    fields: [
      { field: "authorName", type: "text", rules: { required: true } },
      { field: "body", type: "textarea", rules: { required: true } },
      {
        field: "post",
        type: "relation",
        relation: "post",
        display: "title",
        rules: { required: true },
      },
      { field: "approved", type: "boolean" },
    ],
  },
  policy: { scope: "post" },
});
`,
  ],
  [
    "src/dashild/resources/staff.ts",
    `import { defineResource } from "@dashild/core";

export const staffResource = defineResource({
  model: "User",
  navigation: {
    label: "Staff",
    slug: "staff",
    group: "Settings",
    icon: "users",
  },
  table: {
    searchable: ["name", "email"],
    columns: [
      { field: "name", sortable: true },
      { field: "email", sortable: true },
      {
        field: "role",
        format: "badge",
        tone: { ADMIN: "accent", AUTHOR: "muted" },
      },
    ],
    filters: [{ field: "role", type: "enum", label: "Role" }],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      { field: "role", type: "select" },
    ],
  },
  policy: { scope: "public" },
});
`,
  ],
  [
    "src/dashild/policies.ts",
    `import {
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
`,
  ],
  [
    "src/dashild/actions/index.ts",
    `import type { ActionHandler, CurrentUser } from "@dashild/core";

type PostStatus = "PUBLISHED" | "DRAFT";

interface ScopedClient {
  post: {
    update(args: {
      where: { id: string };
      data: { status: PostStatus; publishedAt: Date | null };
    }): Promise<unknown>;
  };
  comment: {
    update(args: {
      where: { id: string };
      data: { approved: boolean };
    }): Promise<unknown>;
  };
}

function dbFrom(context: Parameters<ActionHandler<CurrentUser>>[0]) {
  return context.db as ScopedClient | undefined;
}

async function setPostStatus(
  context: Parameters<ActionHandler<CurrentUser>>[0],
  status: PostStatus,
) {
  if (!context.id) return { ok: false, message: "Missing post id." };
  const db = dbFrom(context);
  if (!db) return { ok: false, message: "Database client unavailable." };

  await db.post.update({
    where: { id: context.id },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });

  return {
    ok: true,
    message: status === "PUBLISHED" ? "Post published." : "Post unpublished.",
  };
}

async function setCommentApproved(
  context: Parameters<ActionHandler<CurrentUser>>[0],
  approved: boolean,
) {
  if (!context.id) return { ok: false, message: "Missing comment id." };
  const db = dbFrom(context);
  if (!db) return { ok: false, message: "Database client unavailable." };

  await db.comment.update({
    where: { id: context.id },
    data: { approved },
  });

  return {
    ok: true,
    message: approved ? "Comment approved." : "Comment unapproved.",
  };
}

/**
 * Handlers run with the scoped Prisma client: an author cannot touch another
 * author's posts or comments even with a guessed id.
 */
export const resourceActions: Record<
  string,
  Record<string, ActionHandler<CurrentUser>>
> = {
  Post: {
    publish: (context) => setPostStatus(context, "PUBLISHED"),
    unpublish: (context) => setPostStatus(context, "DRAFT"),
  },
  Comment: {
    approve: (context) => setCommentApproved(context, true),
    unapprove: (context) => setCommentApproved(context, false),
  },
};
`,
  ],
  [
    "prisma/seed.ts",
    `import "dotenv/config";

import { auth } from "__DASHILD_LIB__/auth";
import { prisma } from "__DASHILD_LIB__/prisma";

const PASSWORD = "dashild123";

async function createUser(input: {
  email: string;
  name: string;
  role: "ADMIN" | "AUTHOR";
}) {
  const created = await auth.api.signUpEmail({
    body: { email: input.email, password: PASSWORD, name: input.name },
  });
  if (!created.user) throw new Error("Better Auth did not create " + input.email);

  await prisma.user.update({
    where: { id: created.user.id },
    data: { role: input.role },
  });
  return created.user;
}

async function main() {
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const ana = await createUser({
    email: "ana@blog.test",
    name: "Ana Torres",
    role: "ADMIN",
  });
  const bruno = await createUser({
    email: "bruno@blog.test",
    name: "Bruno Díaz",
    role: "AUTHOR",
  });
  const carla = await createUser({
    email: "carla@blog.test",
    name: "Carla Ruiz",
    role: "AUTHOR",
  });

  const engineering = await prisma.category.create({
    data: { name: "Engineering", slug: "engineering" },
  });
  const product = await prisma.category.create({
    data: { name: "Product", slug: "product" },
  });

  const tags = [];
  for (const [name, slug] of [
    ["Next.js", "nextjs"],
    ["Prisma", "prisma"],
    ["Design", "design"],
    ["TypeScript", "typescript"],
  ]) {
    tags.push(await prisma.tag.create({ data: { name, slug } }));
  }

  const [nextjs, prismaTag, design, typescript] = tags;

  const posts = [
    {
      title: "Shipping a dashboard in a week",
      slug: "shipping-a-dashboard-in-a-week",
      excerpt: "How one resource file replaced a folder of generated pages.",
      body: "We started with a schema and a resource...",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      authorId: bruno.id,
      categoryId: engineering.id,
      tags: [nextjs.id, prismaTag.id],
    },
    {
      title: "Designing for admins",
      slug: "designing-for-admins",
      excerpt: "The interface your operations team actually needs.",
      body: "Admin UIs fail when they optimize for the demo...",
      status: "REVIEW" as const,
      authorId: carla.id,
      categoryId: product.id,
      tags: [design.id],
    },
    {
      title: "Type-safe forms without a page generator",
      slug: "type-safe-forms-without-a-page-generator",
      excerpt: "One mapping table, one Zod schema, one server check.",
      body: "The resource is data; the server owns the rules...",
      status: "DRAFT" as const,
      authorId: bruno.id,
      categoryId: engineering.id,
      tags: [typescript.id, nextjs.id],
    },
  ];

  for (const post of posts) {
    const { tags: tagIds, ...data } = post;
    await prisma.post.create({
      data: { ...data, tags: { connect: tagIds.map((id) => ({ id })) } },
    });
  }

  const published = await prisma.post.findUnique({
    where: { slug: "shipping-a-dashboard-in-a-week" },
  });

  if (published) {
    await prisma.comment.createMany({
      data: [
        {
          authorName: "Lucía",
          body: "This is exactly the workflow we needed.",
          approved: true,
          postId: published.id,
        },
        {
          authorName: "Marcos",
          body: "How does it handle relations?",
          approved: false,
          postId: published.id,
        },
      ],
    });
  }

  const [users, categories, tagCount, postCount, comments] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.tag.count(),
    prisma.post.count(),
    prisma.comment.count(),
  ]);

  console.log(
    "seed:",
    users,
    "users,",
    categories,
    "categories,",
    tagCount,
    "tags,",
    postCount,
    "posts,",
    comments,
    "comments",
  );
  console.log("admin: ana@blog.test / " + PASSWORD);
  console.log("author: bruno@blog.test / " + PASSWORD);
  console.log("author: carla@blog.test / " + PASSWORD);
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

export const blogTemplate: LoadedTemplate = {
  manifest: {
    ...manifest,
    prisma: { provider: [...manifest.prisma.provider] },
    requires: {
      auth: [...manifest.requires.auth],
      tenancy: manifest.requires.tenancy,
    },
    extend: { ...manifest.extend },
    overwrite: [...manifest.overwrite],
  },
  files,
  source: "bundled",
};
