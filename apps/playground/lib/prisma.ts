import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/src/generated/prisma/client";

/**
 * Cliente Prisma de la app.
 *
 * Prisma 7 exige un driver adapter: no hay engine nativo. La ruta del cliente
 * generado sale de `clientOutput` en `dashild-metadata.json`; aquí se importa
 * por el alias del proyecto, no desde `node_modules`.
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL en el entorno de la app.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
