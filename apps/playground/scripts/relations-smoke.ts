import "dotenv/config";

import { prisma } from "../lib/prisma";
import { runtime } from "../src/dashild/runtime";
import { userResource } from "../src/dashild/resources/user";

const ana = await prisma.user.findUnique({
  where: { email: "ana@acme.test" },
  include: { labels: true, posts: true },
});
if (!ana) throw new Error("Missing demo user. Run db:seed.");

const user = {
  id: ana.id,
  name: ana.name,
  email: ana.email,
  organizationId: ana.organizationId,
  roles: [ana.role],
};

const managers = await runtime.relationManagers(userResource, ana.id, user);
for (const manager of managers) {
  console.log(
    `${manager.field} (${manager.kind}):`,
    manager.rows.length,
    "rows; associate:",
    manager.canAssociate,
    "dissociate:",
    manager.canDissociate,
    "candidates:",
    manager.candidates.map((entry) => entry.label).join(", "),
  );
}

const labels = managers.find((manager) => manager.field === "labels");
const posts = managers.find((manager) => manager.field === "posts");
if (!labels || labels.kind !== "m2m") throw new Error("Missing labels manager.");
if (!posts || posts.kind !== "o2m") throw new Error("Missing posts manager.");
if (posts.canAssociate || posts.canDissociate) {
  throw new Error("o2m with required FK should not allow associate/dissociate.");
}

const gamma = labels.candidates.find((entry) => entry.label === "Gamma");
if (!gamma) throw new Error("Missing Gamma candidate.");

const attached = await runtime.relationAction(
  {
    parentSlug: "users",
    parentId: ana.id,
    relation: "labels",
    operation: "attach",
    childId: gamma.value,
  },
  user,
);
const afterAttach = await prisma.user.findUnique({
  where: { id: ana.id },
  include: { labels: true },
});
console.log(
  "attached:",
  attached,
  afterAttach?.labels.map((label) => label.name).join(", "),
);
if (!afterAttach?.labels.some((label) => label.name === "Gamma")) {
  throw new Error("Attach failed.");
}

const detached = await runtime.relationAction(
  {
    parentSlug: "users",
    parentId: ana.id,
    relation: "labels",
    operation: "detach",
    childId: gamma.value,
  },
  user,
);
const afterDetach = await prisma.user.findUnique({
  where: { id: ana.id },
  include: { labels: true },
});
console.log(
  "detached:",
  detached,
  afterDetach?.labels.map((label) => label.name).join(", "),
);
if (afterDetach?.labels.some((label) => label.name === "Gamma")) {
  throw new Error("Detach failed.");
}

await prisma.$disconnect();
