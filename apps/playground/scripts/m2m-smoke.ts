import "dotenv/config";

import { prisma } from "../lib/prisma";
import { runtime } from "../src/dashild/runtime";
import { userResource } from "../src/dashild/resources/user";

const ana = await prisma.user.findUnique({
  where: { email: "ana@acme.test" },
  include: { labels: true },
});
if (!ana) throw new Error("Missing demo user. Run db:seed.");

const user = {
  id: ana.id,
  name: ana.name,
  email: ana.email,
  organizationId: ana.organizationId,
  roles: [ana.role],
};

const labels = await prisma.label.findMany({ orderBy: { name: "asc" } });
const alpha = labels.find((label) => label.name === "Alpha");
const beta = labels.find((label) => label.name === "Beta");
if (!alpha || !beta) throw new Error("Missing labels. Run db:seed.");

const options = await runtime.formOptions(userResource, user, ana.id);
console.log("label options:", options.labels?.map((entry) => entry.label));

const saved = await runtime.save(
  { slug: "users", id: ana.id, values: { labels: [beta.id] } },
  user,
);
const after = await prisma.user.findUnique({
  where: { id: ana.id },
  include: { labels: true },
});
console.log("saved:", saved);
console.log("labels:", after?.labels.map((label) => label.name).join(", "));
if (after?.labels.length !== 1 || after.labels[0]?.name !== "Beta") {
  throw new Error("m2m set failed.");
}

await runtime.save(
  { slug: "users", id: ana.id, values: { labels: [alpha.id, beta.id] } },
  user,
);
console.log("labels restored");
await prisma.$disconnect();
