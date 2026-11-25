import "dotenv/config";

import {
  canPerform,
  resolvePolicy,
} from "@dashild/core/server";
import { prisma } from "../lib/prisma";
import type { SessionUser } from "../lib/session";
import {
  loadFormOptions,
  loadResourceList,
  loadResourceRecord,
} from "../src/dashild/server/read";
import { policies } from "../src/dashild/policies";
import { organizationResource } from "../src/dashild/resources/organization";
import { userResource } from "../src/dashild/resources/user";

/**
 * Security smoke: organizations A and B through the real loader and policies.
 *
 * Ana (ADMIN, org-1), Bruno (USER, org-2), Carla (USER, org-1).
 */

const rows = await prisma.user.findMany({
  where: { email: { in: ["ana@acme.test", "bruno@beta.test", "carla@acme.test"] } },
  select: { id: true, name: true, email: true, role: true, organizationId: true },
});

const byEmail = new Map(rows.map((row) => [row.email, row]));
const anaRow = byEmail.get("ana@acme.test");
const brunoRow = byEmail.get("bruno@beta.test");
const carlaRow = byEmail.get("carla@acme.test");

if (!anaRow || !brunoRow || !carlaRow) {
  throw new Error("Missing demo users. Run db:seed.");
}

const session = (row: typeof anaRow): SessionUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  organizationId: row.organizationId,
  roles: [row.role],
});

const ana = session(anaRow);
const bruno = session(brunoRow);
const carla = session(carlaRow);

function assertOrg(result: { rows: Record<string, unknown>[] }, org: string) {
  for (const row of result.rows) {
    const organization = row.organization as { id?: string } | null;
    if (organization?.id !== org) {
      throw new Error(`Leaked a row from ${organization?.id} into ${org}.`);
    }
  }
  return result.rows.length;
}

const anaList = await loadResourceList(userResource, { perPage: "100" }, "es", ana);
const brunoList = await loadResourceList(userResource, { perPage: "100" }, "es", bruno);
const carlaList = await loadResourceList(userResource, { perPage: "100" }, "es", carla);

console.log("Ana (org-1):", assertOrg(anaList, "org-1"), "rows");
console.log("Bruno (org-2):", assertOrg(brunoList, "org-2"), "rows");
console.log("Carla (org-1):", assertOrg(carlaList, "org-1"), "rows");

const brunoAsAna = await loadResourceRecord(userResource, brunoRow.id, "es", ana);
const carlaAsAna = await loadResourceRecord(userResource, carlaRow.id, "es", ana);
console.log("Ana reads Bruno:", brunoAsAna === null ? "denied" : "LEAK");
console.log("Ana reads Carla:", carlaAsAna === null ? "LEAK" : "allowed");

const anaPolicy = await resolvePolicy(userResource, policies, ana);
const carlaPolicy = await resolvePolicy(userResource, policies, carla);
if (!anaPolicy.ok || !carlaPolicy.ok) throw new Error("Policy did not resolve.");

console.log(
  "can delete · Ana:",
  await canPerform(anaPolicy.policy, "delete"),
  "· Carla:",
  await canPerform(carlaPolicy.policy, "delete"),
);
console.log(
  "Carla creates in org-1:",
  await canPerform(carlaPolicy.policy, "create", { organization: "org-1" }),
  "· org-2:",
  await canPerform(carlaPolicy.policy, "create", { organization: "org-2" }),
);
console.log(
  "Ana creates in org-2:",
  await canPerform(anaPolicy.policy, "create", { organization: "org-2" }),
);

const anaOrgs = await loadResourceList(organizationResource, {}, "es", ana);
const brunoOrgs = await loadResourceList(organizationResource, {}, "es", bruno);
console.log(
  "Ana organizations:",
  anaOrgs.rows.map((row) => row.name).join(", "),
);
console.log(
  "Bruno organizations:",
  brunoOrgs.rows.map((row) => row.name).join(", "),
);
if (anaOrgs.rows.some((row) => row.name !== "Acme")) {
  throw new Error("Ana sees an organization outside her scope.");
}

const betaAsAna = await loadResourceRecord(organizationResource, "org-2", "es", ana);
console.log("Ana reads Beta organization:", betaAsAna === null ? "denied" : "LEAK");

const carlaOptions = await loadFormOptions(userResource, carla);
const organizationOptions = carlaOptions.organization ?? [];
console.log(
  "Carla organization options:",
  organizationOptions.map((option) => option.label).join(", "),
);
if (organizationOptions.some((option) => option.label === "Beta")) {
  throw new Error("Carla can see an organization outside her scope.");
}

const noPolicy = { ...userResource, policy: undefined };
const failClosed = await resolvePolicy(noPolicy, policies, ana);
console.log("Resource without policy:", failClosed.ok ? "OPEN (bad)" : "denied");

await prisma.$disconnect();
