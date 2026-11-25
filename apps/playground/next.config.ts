import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El cliente de Prisma se genera como TypeScript dentro de `src/`. Next debe
  // tratarlo como paquete externo en servidor, no empaquetarlo en el bundle.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
