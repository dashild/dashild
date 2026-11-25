/**
 * @dashild/prisma — types for the `dashild-metadata.json` artifact.
 *
 * It defines nothing of its own: the metadata contract lives in
 * `@dashild/core` because the generator, the server runtime and the CLI all
 * consume it. This file re-exports it so the generator has a natural local
 * import.
 */

export {
  METADATA_FORMAT_VERSION,
  type DashildMetadata,
  type EnumMetadata,
  type FieldKind,
  type FieldMetadata,
  type ModelMetadata,
  type ScalarKind,
} from "@dashild/core";
