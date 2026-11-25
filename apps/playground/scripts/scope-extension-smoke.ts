import "dotenv/config";

import { withDashildScope } from "@dashild/core/server";
import { prisma } from "../lib/prisma";
import type { SessionUser } from "../lib/session";
import { policies } from "../src/dashild/policies";
import { panel } from "../src/dashild/panel";
import { runtime } from "../src/dashild/runtime";

/**
 * Scope extension smoke: direct Prisma queries, outside the runtime loader.
 *
 * Ana is ADMIN of org-1; Bruno belongs to org-2. The scoped client must not
 * return or mutate Bruno's rows.
 */

const rows = await prisma.user.findMany({
  where: {
    email: { in: ["ana@acme.test", "bruno@beta.test"] },
  },
  select: { id: true, name: true, email: true, role: true, organizationId: true },
});

const anaRow = rows.find((row) => row.email === "ana@acme.test");
const brunoRow = rows.find((row) => row.email === "bruno@beta.test");
if (!anaRow || !brunoRow) throw new Error("Missing demo users. Run db:seed.");

const user = (row: typeof anaRow): SessionUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  organizationId: row.organizationId,
  roles: [row.role],
});

const ana = user(anaRow);
const scoped = prisma.$extends(
  withDashildScope({
    resources: panel.resources,
    policies,
    user: ana,
  }),
);

const users = await scoped.user.findMany({
  select: { email: true, organizationId: true },
});
console.log(
  "scoped users:",
  users.map((entry) => entry.email).join(", "),
);
if (users.some((entry) => entry.organizationId !== "org-1")) {
  throw new Error("The scoped client leaked a user from another organization.");
}

const bruno = await scoped.user.findUnique({
  where: { email: "bruno@beta.test" },
  select: { email: true },
});
console.log("findUnique Bruno:", bruno === null ? "denied" : "LEAK");
if (bruno) throw new Error("findUnique leaked Bruno.");

const organizations = await scoped.organization.findMany({
  select: { id: true, name: true },
});
console.log(
  "scoped organizations:",
  organizations.map((entry) => entry.name).join(", "),
);
if (organizations.some((entry) => entry.id !== "org-1")) {
  throw new Error("The scoped client leaked another organization.");
}

for (const operation of ["update", "delete"] as const) {
  try {
    if (operation === "update") {
      await scoped.user.update({
        where: { id: brunoRow.id },
        data: { name: "Leaked" },
      });
    } else {
      await scoped.user.delete({ where: { id: brunoRow.id } });
    }
    throw new Error(`Scoped ${operation} touched Bruno.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("touched Bruno")) {
      throw error;
    }
    console.log(`scoped ${operation} Bruno: denied`);
  }
}

const runtimeScoped = runtime.client(ana) as typeof prisma;
const runtimeUsers = await runtimeScoped.user.findMany({
  select: { email: true, organizationId: true },
});
if (runtimeUsers.some((entry) => entry.organizationId !== "org-1")) {
  throw new Error("runtime.client leaked a user from another organization.");
}
console.log("runtime.client users:", runtimeUsers.map((entry) => entry.email).join(", "));

console.log("scope extension: ok");
await prisma.$disconnect();
