/**
 * DMMF extraction into the Dashild artifact.
 *
 * It lives outside the entrypoint (`generator.ts`) so it can be tested without
 * starting Prisma's protocol. Everything here is a pure function over input
 * data: same DMMF, same JSON.
 */

import { dirname, isAbsolute, resolve } from "node:path";

import type { DMMF, GeneratorOptions } from "@prisma/generator-helper";

import {
  METADATA_FORMAT_VERSION,
  type DashildMetadata,
  type EnumMetadata,
  type FieldKind,
  type FieldMetadata,
  type ModelMetadata,
} from "@dashild/core";

/** Generator configuration as Prisma sees it. */
export type GeneratorConfig = GeneratorOptions["otherGenerators"][number];

export function extractMetadata(options: GeneratorOptions): DashildMetadata {
  return {
    formatVersion: METADATA_FORMAT_VERSION,
    schemaPath: options.schemaPath,
    ...resolveClientOutput(options.schemaPath, options.otherGenerators),
    ...(options.version ? { engineVersion: options.version } : {}),
    models: options.dmmf.datamodel.models.map(toModelMetadata),
    enums: options.dmmf.datamodel.enums.map(toEnumMetadata),
  };
}

function toModelMetadata(model: DMMF.Model): ModelMetadata {
  // Foreign keys are written by the relation, not the form. If
  // `organizationId` appeared as an editable field, the panel would offer two
  // controls for the same data and one of them could drift.
  const foreignKeys = new Set<string>();
  for (const field of model.fields) {
    if (field.kind !== "object") continue;
    for (const name of field.relationFromFields ?? []) {
      foreignKeys.add(name);
    }
  }

  return {
    name: model.name,
    fields: model.fields.map((field) => toFieldMetadata(field, foreignKeys)),
    ...(model.documentation ? { documentation: model.documentation } : {}),
  };
}

function toFieldMetadata(
  field: DMMF.Field,
  foreignKeys: ReadonlySet<string>,
): FieldMetadata {
  // `nativeType` arrives as a `[name, args]` tuple; the mapping only cares
  // about names (`Text`, `Date`, `Uuid`), not precision.
  const nativeType = field.nativeType?.[0];

  return {
    name: field.name,
    type: field.type,
    kind: field.kind as FieldKind,
    isRequired: field.isRequired,
    isList: field.isList,
    isId: field.isId,
    isUnique: field.isUnique,
    isReadOnly:
      field.isId ||
      (field.isUpdatedAt ?? false) ||
      (field.isGenerated ?? false) ||
      foreignKeys.has(field.name),
    ...(field.isGenerated ? { isGenerated: true } : {}),
    ...(field.isUpdatedAt ? { isUpdatedAt: true } : {}),
    ...(nativeType ? { nativeType } : {}),
    hasDefaultValue: field.hasDefaultValue,
    ...(field.hasDefaultValue && field.default !== undefined
      ? { default: field.default }
      : {}),
    ...(field.documentation ? { documentation: field.documentation } : {}),
    ...(field.relationName ? { relationName: field.relationName } : {}),
    ...(field.relationFromFields?.length
      ? { relationFromFields: [...field.relationFromFields] }
      : {}),
    ...(field.relationToFields?.length
      ? { relationToFields: [...field.relationToFields] }
      : {}),
  };
}

function toEnumMetadata(value: DMMF.DatamodelEnum): EnumMetadata {
  return {
    name: value.name,
    values: value.values.map((entry) => entry.name),
  };
}

/**
 * Path to the generated Prisma client, without assuming `node_modules`
 * (spike §7).
 *
 * Prisma resolves the client generator's `output` relative to the schema. This
 * does the same and returns an absolute path so the runtime does not depend on
 * the starting directory.
 */
export function resolveClientOutput(
  schemaPath: string,
  generators: readonly GeneratorConfig[],
): { clientOutput?: string } {
  const client = generators.find((generator) =>
    (generator.provider.value ?? "").includes("prisma-client"),
  );

  const output = client?.output?.value;
  if (!output) return {};

  return {
    clientOutput: isAbsolute(output)
      ? output
      : resolve(dirname(schemaPath), output),
  };
}
