import "dotenv/config";

import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 CLI configuration.
 *
 * Migrations use DIRECT_URL when it is set (a non-pooled URL), otherwise
 * DATABASE_URL. The app always reads DATABASE_URL through its driver adapter.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL || env("DATABASE_URL"),
  },
});
