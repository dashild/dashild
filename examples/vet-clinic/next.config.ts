import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client","better-sqlite3"],
  // Next 16 only allows localhost for dev assets and HMR; opening 127.0.0.1
  // otherwise leaves the page without hydration.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // create-next-app wires Tailwind v4 through this Turbopack loader. Keep it:
  // without it @theme and package CSS imports fail to resolve.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
