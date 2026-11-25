import "dotenv/config";

import { prisma } from "../lib/prisma";

/**
 * Comprobación de que el cliente de Prisma 7 funciona con el adapter de
 * Postgres y de que los tipos hostiles llegan tal cual los espera el DTO.
 */

const users = await prisma.user.findMany({
  orderBy: { email: "asc" },
  include: { organization: true },
});

for (const user of users) {
  console.log(
    [
      user.email,
      user.organization?.name ?? "sin organización",
      user.role,
      user.balance.toString(),
      String(user.bigNumber),
      JSON.stringify(user.metadata),
    ].join(" · "),
  );
}

const sample = users[0];
if (!sample) throw new Error("La base está vacía: ejecuta el seed primero.");

console.log("tipos crudos:", {
  balance: sample.balance.constructor.name,
  bigNumber: typeof sample.bigNumber,
  createdAt: sample.createdAt.constructor.name,
  metadata: typeof sample.metadata,
});

const byOrganization = await prisma.user.groupBy({
  by: ["organizationId"],
  _count: { _all: true },
});
console.log("usuarios por organización:", byOrganization);

await prisma.$disconnect();
