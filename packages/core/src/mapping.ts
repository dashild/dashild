/**
 * The type mapping table: Dashild's SINGLE CONTRACT.
 *
 * Four things depend on it:
 *
 *   1. El esquema Zod (autoridad en servidor, UX en cliente).
 *   2. The default form field.
 *   3. The default table cell format.
 *   4. The forward (`dto`, Prisma → client) and reverse (`toDb`, client →
 *      (`toDb`, cliente → Prisma).
 *
 * If a type is not here, it does not exist: `make:resource` will not generate
 * runtime will not accept it and `dashild doctor` reports it. The table is the
 * specification; everything else consumes it.
 *
 * It lives in core (isomorphic) because the generator (build time), the server
 * runtime (authority) and the client (UX) need it. It imports no React or
 * Prisma: only `zod`, which is isomorphic.
 */

import { z } from "zod";
import type { EnumMetadata, FieldMetadata, ScalarKind } from "./metadata.js";
import { translate, type Locale } from "./messages.js";

// ---------------------------------------------------------------------------
// Presentation vocabulary
// ---------------------------------------------------------------------------

/**
 * How a value is formatted in the table.
 *
 * `badge` is not a data type: it is a presentation format for discrete
 * values (booleans, enums). The resource sets the actual tone with
 * `ColumnDefinition.tone`.
 */
export type FieldFormat =
  | "text"
  | "badge"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "json";

/** Control de entrada por defecto. */
export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "password"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "relation"
  | "json"
  | "list"
  | "bytes";

/** Operation that determines schema presence. */
export type Operation = "create" | "update";

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

export interface MappingContext {
  /** Values for every enum, indexed by name. */
  readonly enums: ReadonlyMap<string, readonly string[]>;
  /** Locale used for validation messages. */
  readonly locale: Locale;
}

/**
 * Enum index to resolve `Enum` without walking the metadata again on
 * every field.
 */
export function mappingContext(
  metadata: { readonly enums: readonly EnumMetadata[] },
  locale: Locale = "en",
): MappingContext {
  return {
    enums: new Map(metadata.enums.map((entry) => [entry.name, entry.values])),
    locale,
  };
}

/** Empty context: useful when only scalars are resolved. */
export const EMPTY_MAPPING_CONTEXT: MappingContext = {
  enums: new Map(),
  locale: "en",
};

// ---------------------------------------------------------------------------
// Resultado resuelto
// ---------------------------------------------------------------------------

export interface ResolvedFieldMapping {
  /** Control de formulario por defecto. */
  readonly field: FieldType;
  /** Formato de celda por defecto. */
  readonly format: FieldFormat;
  /** Esquema del tipo, sin aplicar obligatoriedad ni nulabilidad. */
  readonly zod: z.ZodTypeAny;
  /** Prisma → cliente. Obligatorio: Decimal y BigInt rompen el panel sin esto. */
  readonly dto: (value: unknown) => unknown;
  /** Client → Prisma. The inverse of `dto`; without it validation is pointless. */
  readonly toDb: (value: unknown) => unknown;
  /** Does it appear in the generated table by default? */
  readonly column: boolean;
  /** Does it appear in the generated form by default? */
  readonly editable: boolean;
  /** Aviso para `dashild doctor` y para el comentario del scaffold. */
  readonly warning?: string;
}

interface ScalarMapping {
  readonly field: FieldType;
  readonly format: FieldFormat;
  readonly zod: (field: FieldMetadata, locale: Locale) => z.ZodTypeAny;
  readonly dto: (value: unknown) => unknown;
  readonly toDb: (value: unknown) => unknown;
  readonly column?: boolean;
  readonly editable?: boolean;
  readonly warning?: string;
}

// ---------------------------------------------------------------------------
// Conversion helpers (isomorphic: no Buffer)
// ---------------------------------------------------------------------------

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;
const BIGINT_PATTERN = /^-?\d+$/;

/** `Decimal` de decimal.js se detecta por forma, no por identidad de clase. */
function isDecimalLike(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as { toFixed?: unknown; toJSON?: unknown };
  return (
    typeof candidate.toFixed === "function" &&
    typeof candidate.toJSON === "function"
  );
}

function toIsoString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  return new Date(String(value));
}

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function fromBase64(value: string): Uint8Array {
  const clean = value.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
  const bytes: number[] = [];

  for (let index = 0; index < clean.length; index += 4) {
    const a = BASE64_ALPHABET.indexOf(clean[index] ?? "");
    const b = BASE64_ALPHABET.indexOf(clean[index + 1] ?? "");
    const c = BASE64_ALPHABET.indexOf(clean[index + 2] ?? "");
    const d = BASE64_ALPHABET.indexOf(clean[index + 3] ?? "");
    if (a < 0 || b < 0) continue;

    bytes.push(((a << 2) | (b >> 4)) & 255);
    if (clean[index + 2] !== "=" && c >= 0) {
      bytes.push(((b << 4) | (c >> 2)) & 255);
    }
    if (clean[index + 3] !== "=" && d >= 0) {
      bytes.push(((c << 6) | d) & 255);
    }
  }

  return new Uint8Array(bytes);
}

function toBase64(bytes: Uint8Array): string {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    output += BASE64_ALPHABET[(triple >> 18) & 63];
    output += BASE64_ALPHABET[(triple >> 12) & 63];
    output += b === undefined ? "=" : BASE64_ALPHABET[(triple >> 6) & 63];
    output += c === undefined ? "=" : BASE64_ALPHABET[triple & 63];
  }
  return output;
}

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

/**
 * Mapping by Prisma scalar type.
 *
 * Rules that are not in the table because they do not depend on the type (see
 * `resolveFieldMapping`): `@id`, `@updatedAt`, `@db.Text`, `@db.Date`,
 * `@db.Uuid`, lists and read-only fields.
 */
export const SCALAR_MAPPINGS: Readonly<Record<ScalarKind, ScalarMapping>> = {
  String: {
    field: "text",
    format: "text",
    zod: (field, locale) => {
      // `@db.Uuid` is a string with a known shape: free to validate.
      if (field.nativeType === "Uuid") {
        return z.uuid({ message: translate(locale, "validation.uuid") });
      }
      return z.string();
    },
    dto: (value) => (value === null || value === undefined ? null : String(value)),
    toDb: (value) => value,
  },

  Boolean: {
    field: "boolean",
    format: "badge",
    zod: () => z.boolean(),
    dto: (value) => (value === null || value === undefined ? null : Boolean(value)),
    toDb: (value) => value,
  },

  Int: {
    field: "number",
    format: "number",
    // No `z.coerce`: coercing "" to 0 is worse than accepting the error.
    zod: (_field, locale) =>
      z.number().int({ message: translate(locale, "validation.integer") }),
    dto: (value) => (value === null || value === undefined ? null : value),
    toDb: (value) => value,
  },

  Float: {
    field: "number",
    format: "number",
    zod: (_field, locale) =>
      z.number().finite({ message: translate(locale, "validation.finite") }),
    dto: (value) => (value === null || value === undefined ? null : value),
    toDb: (value) => value,
  },

  /**
   * `Decimal` travels as a string both ways: a JS `number` loses
   * precision and the client cannot receive the Decimal class across the
   * Server/Client boundary. Prisma accepts a string on write, so `toDb` is
   * identidad.
   *
   * Cell format `number`, not `currency`: a Decimal is not
   * necessarily money (percentages, quantities). The resource sets
   * `format: "currency"` when it is.
   */
  Decimal: {
    field: "number",
    format: "number",
    zod: (_field, locale) =>
      z
        .string()
        .regex(DECIMAL_PATTERN, translate(locale, "validation.decimal")),
    dto: (value) => {
      if (value === null || value === undefined) return null;
      if (isDecimalLike(value)) return String(value);
      return String(value);
    },
    toDb: (value) => (value === null || value === undefined ? null : String(value)),
  },

  /**
   * `BigInt` travels as a string because a JS number cannot represent it.
   * `toDb` rebuilds the bigint before writing: Prisma does not accept the string
   * in every input type, and this is verified against the real client in
   * spike block 1.
   */
  BigInt: {
    field: "number",
    format: "text",
    zod: (_field, locale) =>
      z
        .string()
        .regex(BIGINT_PATTERN, translate(locale, "validation.bigint")),
    dto: (value) => {
      if (value === null || value === undefined) return null;
      return typeof value === "bigint" ? value.toString() : String(value);
    },
    toDb: (value) => {
      if (value === null || value === undefined) return null;
      return typeof value === "bigint" ? value : BigInt(String(value));
    },
  },

  DateTime: {
    field: "datetime",
    format: "datetime",
    zod: (_field, locale) =>
      z.coerce.date({ message: translate(locale, "validation.date") }),
    dto: toIsoString,
    toDb: toDate,
  },

  Json: {
    field: "json",
    format: "json",
    zod: () => z.json(),
    // Prisma returns plain objects for JSON: there is no class to convert.
    dto: (value) => (value === undefined ? null : value),
    toDb: (value) => value,
  },

  /**
   * `Bytes` travels as base64. The form uploads a file, converts it to base64
   * in the browser, and `toDb` turns it back into bytes for Prisma.
   */
  Bytes: {
    field: "bytes",
    format: "text",
    column: false,
    editable: true,
    zod: () => z.string(),
    dto: (value) => {
      if (value === null || value === undefined) return null;
      if (value instanceof Uint8Array) return toBase64(value);
      return null;
    },
    toDb: (value) => (value == null ? null : fromBase64(String(value))),
  },
};

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a DMMF field to its full mapping.
 *
 * It never throws: generation is total (Architecture §10.1). An unknown type
 * type resolves to an editable text field with a warning, not an error.
 */
export function resolveFieldMapping(
  field: FieldMetadata,
  context: MappingContext = EMPTY_MAPPING_CONTEXT,
): ResolvedFieldMapping {
  if (field.kind === "enum") return resolveEnum(field, context);
  if (field.kind === "object") return resolveRelation(field);

  const scalar = (
    SCALAR_MAPPINGS as Readonly<Record<string, ScalarMapping | undefined>>
  )[field.type];

  if (!scalar) return resolveUnknownScalar(field);

  // Scalar lists (`String[]`, `Int[]`...): a JSON array in the form and table.
  if (field.isList) {
    return {
      ...baseFromScalar(scalar, field, context),
      field: "list",
      format: "json",
      zod: z.array(scalar.zod(field, context.locale)),
      dto: (value) =>
        Array.isArray(value) ? value.map((entry) => scalar.dto(entry)) : [],
      toDb: (value) =>
        Array.isArray(value) ? value.map((entry) => scalar.toDb(entry)) : [],
      column: true,
      editable: true,
    };
  }

  const resolved = baseFromScalar(scalar, field, context);

  // `@db.Text` changes the control, not the data.
  if (field.type === "String" && field.nativeType === "Text") {
    return { ...resolved, field: "textarea" };
  }

  // A DateTime with `@db.Date` is a date without time.
  if (field.type === "DateTime" && field.nativeType === "Date") {
    return { ...resolved, field: "date", format: "date" };
  }

  // `@updatedAt` nunca se edita.
  if (field.isUpdatedAt) {
    return { ...resolved, editable: false };
  }

  // The primary key is not editable, but it is shown.
  if (field.isId) {
    return { ...resolved, editable: false };
  }

  // Marked by the generator (computed fields, internal FKs, etc.).
  if (field.isReadOnly || field.isGenerated) {
    return { ...resolved, editable: false };
  }

  return resolved;
}

function baseFromScalar(
  scalar: ScalarMapping,
  field: FieldMetadata,
  context: MappingContext,
): ResolvedFieldMapping {
  return {
    field: scalar.field,
    format: scalar.format,
    zod: scalar.zod(field, context.locale),
    dto: scalar.dto,
    toDb: scalar.toDb,
    column: scalar.column ?? true,
    editable: scalar.editable ?? true,
    ...(scalar.warning ? { warning: scalar.warning } : {}),
  };
}

function resolveEnum(
  field: FieldMetadata,
  context: MappingContext,
): ResolvedFieldMapping {
  if (field.isList) {
    const base = resolveEnum({ ...field, isList: false }, context);
    return {
      ...base,
      field: "list",
      format: "json",
      zod: z.array(base.zod),
      dto: (value) =>
        Array.isArray(value) ? value.map((entry) => base.dto(entry)) : [],
      toDb: (value) =>
        Array.isArray(value) ? value.map((entry) => base.toDb(entry)) : [],
      column: true,
      editable: true,
    };
  }

  const values = context.enums.get(field.type);

  if (!values || values.length === 0) {
    return {
      field: "select",
      format: "badge",
      zod: z.string(),
      dto: (value) => (value === null || value === undefined ? null : String(value)),
      toDb: (value) => value,
      column: true,
      editable: true,
      warning: `Enum ${field.type} has no values in the metadata: treated as text.`,
    };
  }

  return {
    field: "select",
    format: "badge",
    zod: z.enum(values as unknown as [string, ...string[]]),
    dto: (value) => (value === null || value === undefined ? null : String(value)),
    toDb: (value) => value,
    column: true,
    editable: true,
  };
}

function resolveRelation(field: FieldMetadata): ResolvedFieldMapping {
  // One-to-many / many-to-many: the form sends an array of related ids and
  // Prisma receives a nested connect/set.
  if (field.isList) {
    return {
      field: "relation",
      format: "text",
      zod: z
        .array(z.union([z.string(), z.number().int()]))
        .transform((values) => values.map((value) => String(value))),
      dto: (value) => value ?? null,
      toDb: (value) => value,
      column: false,
      editable: true,
    };
  }

  // Many-to-one: the form sends the related row id. It can be Int or String
  // depending on the related model's key.
  return {
    field: "relation",
    format: "text",
    zod: z
      .union([z.string(), z.number().int()])
      .transform((value) => String(value)),
    dto: (value) => value ?? null,
    toDb: (value) => value,
    column: true,
    editable: true,
  };
}

function resolveUnknownScalar(field: FieldMetadata): ResolvedFieldMapping {
  return {
    field: "text",
    format: "text",
    zod: z.string(),
    dto: (value) => (value === null || value === undefined ? null : String(value)),
    toDb: (value) => value,
    column: true,
    editable: true,
    warning: `Unsupported type "${field.type}" on field ${field.name}: treated as text.`,
  };
}

// ---------------------------------------------------------------------------
// Obligatoriedad
// ---------------------------------------------------------------------------

/**
 * Applies the presence the operation requires:
 *
 * - `update`: everything is optional (partial update).
 * - `create`: nullable if the field is not required; optional if it has
 *   `@default`, because the database fills it.
 */
export function buildFieldSchema(
  mapping: ResolvedFieldMapping,
  field: FieldMetadata,
  operation: Operation,
): z.ZodTypeAny {
  if (operation === "update") return mapping.zod.optional();

  let schema = mapping.zod;
  // `nullish`, not just `nullable`: a form can omit the field and an
  // API JSON too. The database decides what to do with the gap.
  if (!field.isRequired) schema = schema.nullish();
  if (field.hasDefaultValue) schema = schema.optional();
  return schema;
}

/**
 * Builds the schema for a full object (form row).
 *
 * It is the function the server uses as authority and the client uses for UX.
 * Same code, two calls.
 */
export function buildObjectSchema(
  fields: readonly FieldMetadata[],
  context: MappingContext,
  operation: Operation,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    const mapping = resolveFieldMapping(field, context);
    if (!mapping.editable) continue;
    shape[field.name] = buildFieldSchema(mapping, field, operation);
  }

  return z.object(shape);
}
