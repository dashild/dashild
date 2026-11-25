import "dotenv/config";

import { defineConfig, env } from "prisma/config";

/**
 * Configuración del CLI de Prisma 7.
 *
 * La URL de conexión ya no vive en `schema.prisma`. El cliente de la app la lee
 * de `.env` a través de Next; el CLI la lee de aquí. `dotenv/config` es
 * necesario porque Prisma 7 dejó de cargar `.env` por su cuenta.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
