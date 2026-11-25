/**
 * `dashild doctor`: compares resource files with Prisma metadata.
 *
 * It parses resources statically instead of importing them: `panel.ts` pulls
 * Next server modules, and the CLI must run outside a request. The resource is
 * data, so reading the `defineResource({...})` object literal is enough.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { parse } from "@babel/parser";
import type {
  CallExpression,
  Expression,
  ObjectExpression,
  PrivateName,
  Program,
} from "@babel/types";
import type {
  DashildMetadata,
  FieldMetadata,
  Locale,
} from "@dashild/core";

import { findMetadata, readMetadata } from "./metadata.js";

export interface DoctorIssue {
  severity: "error" | "warning";
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export interface ResourceReport {
  file: string;
  model?: string;
  slug?: string;
  slugLine?: number;
  issues: DoctorIssue[];
}

export interface DoctorReport {
  ok: boolean;
  resources: ResourceReport[];
  errors: number;
  warnings: number;
}

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

function keyName(key: Expression | PrivateName): string | undefined {
  if (key.type === "Identifier") return key.name;
  if (key.type === "StringLiteral") return key.value;
  return undefined;
}

function objectProperty(
  object: ObjectExpression,
  name: string,
): Expression | undefined {
  for (const property of object.properties) {
    if (property.type !== "ObjectProperty") continue;
    if (keyName(property.key) === name) {
      return property.value as Expression;
    }
  }
  return undefined;
}

function asObject(value: Expression | undefined): ObjectExpression | undefined {
  return value?.type === "ObjectExpression" ? value : undefined;
}

function asArray(value: Expression | undefined): Expression[] {
  if (value?.type !== "ArrayExpression") return [];
  return value.elements.filter(
    (element): element is Expression => element !== null && element.type !== "SpreadElement",
  );
}

function arrayObjects(value: Expression | undefined): ObjectExpression[] {
  return asArray(value).filter(
    (element): element is ObjectExpression => element.type === "ObjectExpression",
  );
}

function stringValue(value: Expression | undefined): string | undefined {
  return value?.type === "StringLiteral" ? value.value : undefined;
}

function stringField(
  object: ObjectExpression | undefined,
  name: string,
): string | undefined {
  if (!object) return undefined;
  return stringValue(objectProperty(object, name));
}

function isDefineResourceCall(call: CallExpression): boolean {
  return call.callee.type === "Identifier" && call.callee.name === "defineResource";
}

function findDefineResource(program: Program): CallExpression | undefined {
  for (const node of program.body) {
    if (node.type === "VariableDeclaration") {
      for (const declaration of node.declarations) {
        const init = declaration.init;
        if (init?.type === "CallExpression" && isDefineResourceCall(init)) {
          return init;
        }
      }
      continue;
    }

    if (node.type === "ExportNamedDeclaration") {
      const declaration = node.declaration;
      if (declaration?.type !== "VariableDeclaration") continue;
      for (const declarator of declaration.declarations) {
        const init = declarator.init;
        if (init?.type === "CallExpression" && isDefineResourceCall(init)) {
          return init;
        }
      }
      continue;
    }

    if (
      node.type === "ExportDefaultDeclaration" &&
      node.declaration.type === "CallExpression" &&
      isDefineResourceCall(node.declaration)
    ) {
      return node.declaration;
    }
  }

  return undefined;
}

function lineOf(node: Expression | undefined): number | undefined {
  return node?.loc?.start.line;
}

// ---------------------------------------------------------------------------
// Analyzer
// ---------------------------------------------------------------------------

function fieldError(
  file: string,
  node: Expression | undefined,
  message: string,
  suggestion: string,
): DoctorIssue {
  return {
    severity: "error",
    file,
    line: lineOf(node),
    message,
    suggestion,
  };
}

function fieldWarning(
  file: string,
  node: Expression | undefined,
  message: string,
): DoctorIssue {
  return { severity: "warning", file, line: lineOf(node), message };
}

export function analyzeResourceSource(
  source: string,
  file: string,
  metadata: DashildMetadata,
): ResourceReport {
  const issues: DoctorIssue[] = [];
  let program: Program;

  try {
    program = parse(source, {
      sourceType: "module",
      plugins: ["typescript"],
    }).program;
  } catch (error) {
    const line = (error as { loc?: { line?: number } }).loc?.line;
    return {
      file,
      issues: [
        {
          severity: "error",
          file,
          line,
          message: `Could not parse the resource: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }

  const call = findDefineResource(program);
  if (!call) {
    return {
      file,
      issues: [
        {
          severity: "error",
          file,
          message:
            "No defineResource({...}) call found. Is this a Dashild resource?",
        },
      ],
    };
  }

  const definition = asObject(call.arguments[0] as Expression | undefined);
  if (!definition) {
    return {
      file,
      issues: [
        {
          severity: "error",
          file,
          message: "defineResource(...) expects an object literal.",
        },
      ],
    };
  }

  const modelNode = objectProperty(definition, "model");
  const modelName = stringValue(modelNode);
  const model = modelName
    ? metadata.models.find((entry) => entry.name === modelName)
    : undefined;

  if (!modelName) {
    issues.push(
      fieldError(file, modelNode, "Resource does not declare a model.", "Add model: \"Model\"."),
    );
  } else if (!model) {
    issues.push(
      fieldError(
        file,
        modelNode,
        `Model "${modelName}" is not in the metadata.`,
        "Check the model name or run prisma generate.",
      ),
    );
  }

  const navigation = asObject(objectProperty(definition, "navigation"));
  const slugNode = navigation ? objectProperty(navigation, "slug") : undefined;
  const slug = stringValue(slugNode);
  if (!slug) {
    issues.push(
      fieldError(
        file,
        slugNode,
        "Resource does not declare navigation.slug.",
        "Add navigation: { slug: \"users\", ... }.",
      ),
    );
  }

  const policy = objectProperty(definition, "policy");
  if (!policy) {
    issues.push(
      fieldError(
        file,
        definition,
        "Resource has no policy; the runtime will deny it.",
        "Add policy: { scope: \"organization\" } and an entry in src/dashild/policies.ts.",
      ),
    );
  } else {
    const policyObject = asObject(policy);
    const scopeNode = policyObject
      ? objectProperty(policyObject, "scope")
      : undefined;
    if (!stringValue(scopeNode)) {
      issues.push(
        fieldError(
          file,
          scopeNode ?? policy,
          "policy.scope is missing.",
          "Declare the scope name, for example scope: \"organization\".",
        ),
      );
    }
  }

  if (model) {
    const fields = new Map(model.fields.map((field) => [field.name, field]));
    const table = asObject(objectProperty(definition, "table"));

    for (const column of arrayObjects(
      table ? objectProperty(table, "columns") : undefined,
    )) {
      const fieldNode = objectProperty(column, "field");
      const fieldName = stringValue(fieldNode);
      if (!fieldName) {
        issues.push(fieldWarning(file, column, "Column without a field."));
        continue;
      }

      const field = fields.get(fieldName);
      if (!field) {
        issues.push(
          fieldError(
            file,
            fieldNode,
            `Field "${fieldName}" does not exist in ${model.name}.`,
            "Remove the column or add the field to the schema.",
          ),
        );
        continue;
      }

      const display = stringField(column, "display");
      if (field.kind === "object") {
        if (field.isList) {
          issues.push(
            fieldWarning(
              file,
              fieldNode,
              `Relation "${fieldName}" is a list; list relations are not editable in v1.`,
            ),
          );
        } else if (!display) {
          issues.push(
            fieldWarning(
              file,
              fieldNode,
              `Relation "${fieldName}" has no display field.`,
            ),
          );
        } else {
          const related = metadata.models.find(
            (entry) => entry.name === field.type,
          );
          if (!related) {
            issues.push(
              fieldError(
                file,
                fieldNode,
                `Related model "${field.type}" is not in the metadata.`,
                "Run prisma generate.",
              ),
            );
          } else if (
            !related.fields.some((entry) => entry.name === display)
          ) {
            issues.push(
              fieldError(
                file,
                fieldNode,
                `Display field "${display}" does not exist in ${field.type}.`,
                "Use an existing field of the related model.",
              ),
            );
          }
        }
      } else if (display) {
        issues.push(
          fieldWarning(
            file,
            fieldNode,
            `"display" is only used on relation columns (${fieldName}).`,
          ),
        );
      }
    }

    for (const filter of arrayObjects(
      table ? objectProperty(table, "filters") : undefined,
    )) {
      const fieldNode = objectProperty(filter, "field");
      const fieldName = stringValue(fieldNode);
      if (!fieldName) continue;

      const field = fields.get(fieldName);
      if (!field) {
        issues.push(
          fieldError(
            file,
            fieldNode,
            `Filter field "${fieldName}" does not exist in ${model.name}.`,
            "Remove the filter or add the field to the schema.",
          ),
        );
        continue;
      }

      const type = stringField(filter, "type");
      if (type === "relation" && field.kind !== "object") {
        issues.push(
          fieldError(
            file,
            fieldNode,
            `Filter "${fieldName}" is declared as relation but is a scalar.`,
            "Use a relation field or change the filter type.",
          ),
        );
      }
      if (type === "enum" && field.kind !== "enum") {
        issues.push(
          fieldWarning(
            file,
            fieldNode,
            `Filter "${fieldName}" is declared as enum but is not an enum.`,
          ),
        );
      }
    }

    const form = asObject(objectProperty(definition, "form"));
    for (const entry of arrayObjects(
      form ? objectProperty(form, "fields") : undefined,
    )) {
      const fieldNode = objectProperty(entry, "field");
      const fieldName = stringValue(fieldNode);
      if (!fieldName) continue;

      const field = fields.get(fieldName);
      if (!field) {
        issues.push(
          fieldError(
            file,
            fieldNode,
            `Form field "${fieldName}" does not exist in ${model.name}.`,
            "Remove the field or add it to the schema.",
          ),
        );
        continue;
      }

      if (field.isId || field.isUpdatedAt || field.isReadOnly) {
        issues.push(
          fieldWarning(
            file,
            fieldNode,
            `Field "${fieldName}" is read-only but appears in the form.`,
          ),
        );
      }

      const type = stringField(entry, "type");
      if (type === "relation" && field.kind !== "object") {
        issues.push(
          fieldError(
            file,
            fieldNode,
            `Form field "${fieldName}" is declared as relation but is not one.`,
            "Use a relation field or change the field type.",
          ),
        );
      }
      if (
        type !== "relation" &&
        field.kind === "object" &&
        !field.isList
      ) {
        issues.push(
          fieldWarning(
            file,
            fieldNode,
            `Form field "${fieldName}" is a relation; use type: "relation".`,
          ),
        );
      }
      if (type === "select" && field.kind !== "enum") {
        issues.push(
          fieldWarning(
            file,
            fieldNode,
            `Form field "${fieldName}" is a select but is not an enum.`,
          ),
        );
      }
    }
  }

  issues.sort((left, right) => (left.line ?? 0) - (right.line ?? 0));

  return {
    file,
    ...(modelName ? { model: modelName } : {}),
    ...(slug ? { slug } : {}),
    ...(lineOf(slugNode) ? { slugLine: lineOf(slugNode) } : {}),
    issues,
  };
}

// ---------------------------------------------------------------------------
// Project scan
// ---------------------------------------------------------------------------

function duplicateSlugIssues(resources: ResourceReport[]): void {
  const bySlug = new Map<string, ResourceReport[]>();

  for (const resource of resources) {
    if (!resource.slug) continue;
    const group = bySlug.get(resource.slug) ?? [];
    group.push(resource);
    bySlug.set(resource.slug, group);
  }

  for (const [slug, group] of bySlug) {
    if (group.length < 2) continue;

    for (const resource of group) {
      const others = group
        .filter((entry) => entry.file !== resource.file)
        .map((entry) => entry.file)
        .join(", ");

      resource.issues.push({
        severity: "error",
        file: resource.file,
        line: resource.slugLine,
        message: `Duplicate navigation.slug "${slug}" (also in ${others}).`,
        suggestion: "Give every resource a unique slug.",
      });
    }
  }
}

export function runDoctor(options: {
  cwd: string;
  metadata?: string;
  dir: string;
  locale?: Locale;
}): DoctorReport {
  const metadataPath = findMetadata(
    options.cwd,
    options.metadata,
    options.locale ?? "en",
  );
  const metadata = readMetadata(metadataPath, options.locale ?? "en");

  const directory = resolve(options.cwd, options.dir);
  if (!existsSync(directory)) {
    throw new Error(`Resources directory not found: ${directory}`);
  }

  const files = readdirSync(directory)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"))
    .sort();

  const resources = files.map((file) =>
    analyzeResourceSource(
      readFileSync(join(directory, file), "utf8"),
      relative(options.cwd, join(directory, file)),
      metadata,
    ),
  );

  duplicateSlugIssues(resources);
  for (const resource of resources) {
    resource.issues.sort(
      (left, right) => (left.line ?? 0) - (right.line ?? 0),
    );
  }

  const errors = resources.reduce(
    (total, resource) =>
      total + resource.issues.filter((issue) => issue.severity === "error").length,
    0,
  );
  const warnings = resources.reduce(
    (total, resource) =>
      total +
      resource.issues.filter((issue) => issue.severity === "warning").length,
    0,
  );

  return {
    ok: errors === 0 && resources.length > 0,
    resources,
    errors,
    warnings,
  };
}

export function formatDoctor(report: DoctorReport): string {
  const lines: string[] = ["dashild doctor", ""];

  if (report.resources.length === 0) {
    lines.push("No resource files found.");
  }

  for (const resource of report.resources) {
    lines.push(
      `Resource: ${resource.model ?? "(unknown model)"} · ${resource.file}`,
    );

    if (resource.issues.length === 0) {
      lines.push("  ✓ no issues");
    }

    for (const issue of resource.issues) {
      const icon = issue.severity === "error" ? "✗" : "⚠";
      const line = issue.line ? ` line ${issue.line}:` : "";
      lines.push(`  ${icon}${line} ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`    Suggestion: ${issue.suggestion}`);
      }
    }

    lines.push("");
  }

  lines.push(
    `Result: ${report.errors} errors, ${report.warnings} warnings in ${report.resources.length} resources.`,
  );

  return lines.join("\n");
}
