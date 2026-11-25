import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/lib/prisma";

/**
 * Better Auth sobre el Prisma de la app.
 *
 * `organizationId` y `role` son campos adicionales del usuario, pero con
 * `input: false`: el sign-up no puede elegirlos. La organización se asigna
 * desde el panel y el rol, desde el servidor. Si un usuario se registra sin
 * organización, no ve datos: el aislamiento falla cerrado.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  appName: "Acme Admin",
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3100"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },
  advanced: {
    database: {
      // El schema usa `@db.Uuid` en `User.id`; Better Auth, por defecto,
      // genera un string aleatorio que Postgres rechaza.
      generateId: () => crypto.randomUUID(),
    },
  },
  user: {
    additionalFields: {
      organizationId: {
        type: "string",
        required: false,
        input: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
    },
  },
});
