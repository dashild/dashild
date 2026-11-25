/**
 * Resource file generation.
 *
 * Pure function: takes metadata and returns the file contents. It uses the
 * mapping table from `@dashild/core`, the same one the runtime uses, so the
 * scaffold cannot drift from what the panel can render.
 */

import {
  mappingContext,
  resolveFieldMapping,
  type DashildMetadata,
  type FieldMetadata,
  type Locale,
  type ModelMetadata,
} from "@dashild/core";

import { cliMessage } from "./messages.js";

import {
  humanize,
  resourceExportName,
  resourceLabel,
  resourceSlug,
} from "./naming.js";

const AUDIT_FIELDS = new Set(["createdAt", "updatedAt", "deletedAt"]);

const SEARCH_PRIORITY = ["name", "email", "title", "slug", "label"];

const DISPLAY_CANDIDATES = ["name", "title", "label", "email", "slug"];

function quote(value: string): string {
  return JSON.stringify(value);
}

function isAuditField(field: FieldMetadata): boolean {
  return AUDIT_FIELDS.has(field.name);
}

function isRelation(field: FieldMetadata): boolean {
  return field.kind === "object";
}

/** o2m needs a child manager; m2m is a plain id list. */
function isO2M(
  field: FieldMetadata,
  models: ReadonlyMap<string, ModelMetadata>,
): boolean {
  if (!field.isList) return false;
  const related = models.get(field.type);
  return Boolean(
    related?.fields.some(
      (entry) =>
        entry.kind === "object" &&
        !entry.isList &&
        entry.relationName === field.relationName,
    ),
  );
}

function guessDisplay(
  models: ReadonlyMap<string, ModelMetadata>,
  relatedModel: string | undefined,
): string {
  if (!relatedModel) return "id";
  const model = models.get(relatedModel);
  if (!model) return "id";

  for (const candidate of DISPLAY_CANDIDATES) {
    const field = model.fields.find((entry) => entry.name === candidate);
    if (field?.kind === "scalar" && field.type === "String") return candidate;
  }

  return "id";
}

function formType(field: FieldMetadata, mapped: string): string {
  if (mapped === "text") {
    if (/email/i.test(field.name)) return "email";
    if (/password/i.test(field.name)) return "password";
  }
  return mapped;
}

interface ColumnSpec {
  field: string;
  label: string;
  sortable: boolean;
  format?: string;
  display?: string;
}

interface FilterSpec {
  field: string;
  type: string;
  label: string;
  display?: string;
}

interface FormSpec {
  field: string;
  type: string;
  label: string;
  relation?: string;
  display?: string;
  multiple?: boolean;
  required: boolean;
}

function serializeColumn(column: ColumnSpec): string {
  const parts = [
    `field: ${quote(column.field)}`,
    `label: ${quote(column.label)}`,
  ];
  if (column.sortable) parts.push("sortable: true");
  if (column.format) parts.push(`format: ${quote(column.format)}`);
  if (column.display) parts.push(`display: ${quote(column.display)}`);
  return `{ ${parts.join(", ")} }`;
}

function serializeFilter(filter: FilterSpec): string {
  const parts = [
    `field: ${quote(filter.field)}`,
    `type: ${quote(filter.type)}`,
    `label: ${quote(filter.label)}`,
  ];
  if (filter.display) parts.push(`display: ${quote(filter.display)}`);
  return `{ ${parts.join(", ")} }`;
}

function serializeFormField(field: FormSpec): string {
  const parts = [
    `field: ${quote(field.field)}`,
    `type: ${quote(field.type)}`,
    `label: ${quote(field.label)}`,
  ];
  if (field.relation) parts.push(`relation: ${quote(field.relation)}`);
  if (field.display) parts.push(`display: ${quote(field.display)}`);
  if (field.multiple) parts.push("multiple: true");
  if (field.required) parts.push("rules: { required: true }");
  return `{ ${parts.join(", ")} }`;
}

function indent(lines: string[], spaces: number): string {
  const pad = " ".repeat(spaces);
  return lines.map((line) => `${pad}${line}`).join("\n");
}

/**
 * Builds the contents of `src/dashild/resources/<model>.ts`.
 *
 * It never writes: the command decides that and applies write-once.
 */
export function generateResourceFile(
  metadata: DashildMetadata,
  modelName: string,
  locale: Locale = "en",
): string {
  const model = metadata.models.find(
    (entry) => entry.name.toLowerCase() === modelName.toLowerCase(),
  );

  if (!model) {
    const available = metadata.models.map((entry) => entry.name).join(", ");
    throw new Error(
      cliMessage(locale, "model.notFound", {
        model: modelName,
        models: available,
      }),
    );
  }

  const context = mappingContext(metadata);
  const models = new Map(metadata.models.map((entry) => [entry.name, entry]));

  const columns: ColumnSpec[] = [];
  const filters: FilterSpec[] = [];
  const formFields: FormSpec[] = [];
  const searchable: string[] = [];

  for (const field of model.fields) {
    const mapping = resolveFieldMapping(field, context);

    // `id`, `@updatedAt` and relation-owned foreign keys are neither edited nor
    // listed: the panel shows the relation, not its key.
    if (field.isId || field.isUpdatedAt || field.isReadOnly) continue;

    const label = humanize(field.name);

    if (mapping.column) {
      if (isRelation(field)) {
        const display = guessDisplay(models, field.type);
        columns.push({
          field: field.name,
          label,
          sortable: true,
          display,
        });
        filters.push({
          field: field.name,
          type: "relation",
          label,
          display,
        });
      } else {
        columns.push({
          field: field.name,
          label,
          sortable: field.type !== "Json",
          ...(mapping.format !== "text" ? { format: mapping.format } : {}),
        });

        if (field.kind === "enum") {
          filters.push({ field: field.name, type: "enum", label });
        } else if (field.type === "Boolean") {
          filters.push({ field: field.name, type: "boolean", label });
        }

        if (
          field.type === "String" &&
          field.nativeType !== "Text" &&
          !isAuditField(field)
        ) {
          searchable.push(field.name);
        }
      }
    }

    if (!mapping.editable || isAuditField(field)) continue;
    if (isRelation(field) && isO2M(field, models)) continue;

    formFields.push({
      field: field.name,
      type: formType(field, mapping.field),
      label,
      ...(isRelation(field) ? { relation: field.name } : {}),
      ...(isRelation(field)
        ? { display: guessDisplay(models, field.type) }
        : {}),
      ...(isRelation(field) && field.isList ? { multiple: true } : {}),
      required:
        !field.isList && field.isRequired && !field.hasDefaultValue,
    });
  }

  // Most useful search fields first.
  searchable.sort((left, right) => {
    const leftPriority = SEARCH_PRIORITY.indexOf(left);
    const rightPriority = SEARCH_PRIORITY.indexOf(right);
    const leftScore = leftPriority === -1 ? SEARCH_PRIORITY.length : leftPriority;
    const rightScore =
      rightPriority === -1 ? SEARCH_PRIORITY.length : rightPriority;
    return leftScore - rightScore || left.localeCompare(right);
  });
  searchable.splice(3);

  const tableLines: string[] = [];
  if (searchable.length > 0) {
    tableLines.push(
      `searchable: [${searchable.map(quote).join(", ")}],`,
    );
  }
  tableLines.push("pageSize: 25,");
  tableLines.push("columns: [");
  tableLines.push(
    indent(columns.map((column) => `${serializeColumn(column)},`), 2),
  );
  tableLines.push("],");
  if (filters.length > 0) {
    tableLines.push("filters: [");
    tableLines.push(
      indent(filters.map((filter) => `${serializeFilter(filter)},`), 2),
    );
    tableLines.push("],");
  }

  const formLines = [
    "form: {",
    "  fields: [",
    indent(formFields.map((field) => `${serializeFormField(field)},`), 4),
    "  ],",
    "},",
  ];

  return `import { defineResource } from "@dashild/core";

/**
 * ${model.name} resource.
 *
 * Generated by \`dashild make:resource\` from dashild-metadata.json.
 * This file is yours: edit it freely. Dashild will not overwrite it.
 */
export const ${resourceExportName(model.name)} = defineResource({
  model: ${quote(model.name)},

  // The policy entry is keyed by model in policies.ts. This name is only
  // documentation; change it if your app uses another convention.
  policy: { scope: "default" },

  navigation: {
    label: ${quote(resourceLabel(model.name))},
    slug: ${quote(resourceSlug(model.name))},
  },

  table: {
${indent(tableLines, 4)}
  },

${indent(formLines, 2)}
});
`;
}
