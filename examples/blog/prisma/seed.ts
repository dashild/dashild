import "dotenv/config";

import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

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
