/**
 * Prisma client for the app.
 *
 * Prisma 7 uses driver adapters: there is no native engine.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL in the environment.");
  }

  // prisma.config.ts lives at the project root, so the CLI and this adapter
  // both resolve a relative file: URL from the working directory.
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: connectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
