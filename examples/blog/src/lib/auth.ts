import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { sendEmail } from "./email";
import { prisma } from "./prisma";

/**
 * Better Auth with the app's Prisma client.
 *
 * Auth models live in prisma/schema.prisma. Keep BETTER_AUTH_SECRET out of
 * version control; see .env.example.
 *
 * ALLOW_SIGNUP=false closes public sign-up; create users yourself.
 * REQUIRE_EMAIL_VERIFICATION=true needs a real sendEmail implementation.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  appName: "Dashild",
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : [],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    disableSignUp: process.env.ALLOW_SIGNUP === "false",
    requireEmailVerification:
      process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: "Open this link to reset your password: " + url,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        text: "Open this link to verify your email: " + url,
      });
    },
  },
});
