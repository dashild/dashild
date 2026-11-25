import type { DashildMetadata } from "@dashild/core";

import metadataJson from "@/src/generated/dashild/dashild-metadata.json";

/**
 * Metadatos de Prisma cargados una vez por proceso.
 *
 * El artefacto lo escribe `prisma generate`; no es configuración administrativa.
 */
export const metadata = metadataJson as unknown as DashildMetadata;

export function metadataModel(name: string) {
  return metadata.models.find((model) => model.name === name);
}

export function prismaDelegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}
