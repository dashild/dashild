/**
 * Metadata contract between `@dashild/prisma` (generator, build time),
 * `@dashild/core/server` (runtime) y `@dashild/cli` (scaffold).
 *
 * It lives in core, not in prisma, because all three consume it and it cannot
 * drag Prisma into the runtime. They are plain data: serializable, no deps.
 */

export const METADATA_FORMAT_VERSION = 1;

export type ScalarKind =
  | "String"
  | "Boolean"
  | "Int"
  | "BigInt"
  | "Float"
  | "Decimal"
  | "DateTime"
  | "Json"
  | "Bytes";

export type FieldKind = "scalar" | "enum" | "object";

export interface FieldMetadata {
  name: string;
  /** Tipo escalar (`String`), nombre del enum o nombre del modelo relacionado. */
  type: string;
  kind: FieldKind;
  isRequired: boolean;
  isList: boolean;
  isId: boolean;
  isUnique: boolean;
  /** Calculado por el generador: `@id`, columnas generadas o FK internas. */
  isReadOnly: boolean;
  /** Campo generado por la base de datos (columnas computadas). */
  isGenerated?: boolean;
  /** `@updatedAt`. No aparece nunca en el formulario. */
  isUpdatedAt?: boolean;
  /**
   * Native type flattened to a string (`Text`, `VarChar`, `Decimal`...), if the DMMF
   * exposes it. `@db.Text` changes the field to textarea.
   */
  nativeType?: string;
  hasDefaultValue: boolean;
  /** Valor por defecto tal cual lo da el DMMF: primitivo u objeto `{ name, args }`. */
  default?: unknown;
  documentation?: string;
  relationName?: string;
  /** FK fields on this model that the relation writes. */
  relationFromFields?: string[];
  relationToFields?: string[];
}

export interface ModelMetadata {
  name: string;
  fields: FieldMetadata[];
  documentation?: string;
}

export interface EnumMetadata {
  name: string;
  values: string[];
}

export interface DashildMetadata {
  /** Format version. Dashild rejects metadata from an unknown version. */
  formatVersion: number;
  /** Absolute path of the generating `schema.prisma`. */
  schemaPath: string;
  /**
   * Absolute path to the generated Prisma client, if the schema declares a
   * generador `prisma-client`. Sin asumir `node_modules` (spike §7).
   */
  clientOutput?: string;
  /**
   * Engine hash Prisma generated with. Prisma's `options.version` is not the
   * package version, it is the engine commit: stored as diagnostics.
   */
  engineVersion?: string;
  models: ModelMetadata[];
  enums: EnumMetadata[];
}
