import "dotenv/config";

import { mappingContext } from "@dashild/core";
import { parseWriteInput } from "@dashild/core/server";

import { prisma } from "../lib/prisma";
import {
  metadata,
  metadataModel,
  prismaDelegateName,
} from "../src/dashild/server/metadata";
import { userResource } from "../src/dashild/resources/user";

/**
 * Smoke de escritura.
 *
 * Usa el mismo camino que la acción de servidor (validación + `toDb`) y el
 * mismo delegate de Prisma. Crea, actualiza y borra un usuario temporal para
 * demostrar que la escritura funciona sin depender de la UI.
 */

const model = metadataModel("User");
if (!model) throw new Error("Falta el modelo User en los metadatos.");

const delegate = (
  prisma as unknown as Record<
    string,
    {
      create: (args: { data: Record<string, unknown> }) => Promise<{
        id: string;
        email: string;
        balance: { toString(): string };
        bigNumber: bigint;
      }>;
      update: (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => Promise<unknown>;
      delete: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    }
  >
)[prismaDelegateName("User")];

if (!delegate) throw new Error("Prisma no expone el delegate user.");

const context = mappingContext(metadata);
const email = `smoke-${Date.now()}@example.com`;

const created = parseWriteInput(
  userResource,
  model,
  context,
  {
    name: "Smoke Test",
    email,
    role: "USER",
    organization: "org-1",
    balance: "12.34",
    isActive: true,
  },
  "create",
);

if (!created.ok) {
  throw new Error(`create: ${JSON.stringify(created.fieldErrors)}`);
}

const user = await delegate.create({ data: created.data });
console.log("creado:", user.id, user.email, user.balance.toString(), user.bigNumber);

const updated = parseWriteInput(
  userResource,
  model,
  context,
  { name: "Smoke Updated" },
  "update",
);

if (!updated.ok) {
  throw new Error(`update: ${JSON.stringify(updated.fieldErrors)}`);
}

await delegate.update({ where: { id: user.id }, data: updated.data });
console.log("actualizado:", updated.data);

await delegate.delete({ where: { id: user.id } });
console.log("borrado:", user.id);

await prisma.$disconnect();
