/**
 * `dashild doctor`: compares resource files with Prisma metadata.
 *
 * It parses resources statically instead of importing them: `panel.ts` pulls
 * Next server modules, and the CLI must run outside a request. The resource is
 * data, so reading the `defineResource({...})` object literal is enough.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { parse } from "@babel/parser";
import type {
  CallExpression,
  Expression,
  ObjectExpression,
  PrivateName,
  Program,
} from "@babel/types";
import {
  isBuiltInAction,
  type DashildMetadata,
  type FieldMetadata,
  type Locale,
} from "@dashild/core";

import { findMetadata, readMetadata } from "./metadata.js";

export interface DoctorIssue {
  severity: "error" | "warning";
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export interface ResourceAction {
  name: string;
  line?: number;
  requires?: string;
}

export interface ResourceReport {
  file: string;
  model?: string;
  slug?: string;
  slugLine?: number;
  actions: ResourceAction[];
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

function unwrapExpression(
  value: Expression | undefined,
): Expression | undefined {
  if (
    value?.type === "TSAsExpression" ||
    value?.type === "TSSatisfiesExpression" ||
    value?.type === "TSNonNullExpression"
  ) {
    return unwrapExpression(value.expression);
  }
  return value;
}

function asObject(value: Expression | undefined): ObjectExpression | undefined {
  const expression = unwrapExpression(value);
  return expression?.type === "ObjectExpression" ? expression : undefined;
}

function asArray(value: Expression | undefined): Expression[] {
  const expression = unwrapExpression(value);
  if (expression?.type !== "ArrayExpression") return [];
  return expression.elements.filter(
    (element): element is Expression =>
      element !== null && element.type !== "SpreadElement",
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
      actions: [],
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
      actions: [],
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
      actions: [],
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

  const actions: ResourceAction[] = [];

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

    for (const container of [table, form]) {
      for (const action of arrayObjects(
        container ? objectProperty(container, "actions") : undefined,
      )) {
        const nameNode = objectProperty(action, "name");
        const name = stringValue(nameNode);
        if (!name || isBuiltInAction(name)) continue;

        actions.push({
          name,
          line: lineOf(nameNode) ?? lineOf(action),
          ...(stringField(action, "requires")
            ? { requires: stringField(action, "requires") }
            : {}),
        });
      }
    }
  }

  issues.sort((left, right) => (left.line ?? 0) - (right.line ?? 0));

  return {
    file,
    ...(modelName ? { model: modelName } : {}),
    ...(slug ? { slug } : {}),
    ...(lineOf(slugNode) ? { slugLine: lineOf(slugNode) } : {}),
    actions,
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

interface PoliciesInfo {
  exists: boolean;
  models: Set<string>;
  can: Map<string, Set<string> | null>;
}

interface ActionsInfo {
  exists: boolean;
  handlers: Map<string, Set<string>>;
  unknown: Set<string>;
}

function findCallNamed(program: Program, name: string): CallExpression | undefined {
  for (const node of program.body) {
    if (node.type === "VariableDeclaration") {
      for (const declaration of node.declarations) {
        const init = declaration.init;
        if (
          init?.type === "CallExpression" &&
          init.callee.type === "Identifier" &&
          init.callee.name === name
        ) {
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
        if (
          init?.type === "CallExpression" &&
          init.callee.type === "Identifier" &&
          init.callee.name === name
        ) {
          return init;
        }
      }
    }
  }

  return undefined;
}

function readPolicies(path: string): PoliciesInfo {
  const info: PoliciesInfo = {
    exists: existsSync(path),
    models: new Set(),
    can: new Map(),
  };
  if (!info.exists) return info;

  const program = parse(readFileSync(path, "utf8"), {
    sourceType: "module",
    plugins: ["typescript"],
  }).program;
  const call = findCallNamed(program, "definePolicies");
  const definition = call
    ? asObject(call.arguments[0] as Expression | undefined)
    : undefined;
  const resources = definition
    ? asObject(objectProperty(definition, "resources"))
    : undefined;
  if (!resources) return info;

  for (const property of resources.properties) {
    if (property.type !== "ObjectProperty") continue;
    const model = keyName(property.key as Expression);
    if (!model) continue;

    info.models.add(model);
    const value = asObject(property.value as Expression);
    if (!value) {
      info.can.set(model, null);
      continue;
    }

    const can = asObject(objectProperty(value, "can"));
    info.can.set(
      model,
      new Set(
        can
          ? can.properties
              .filter((entry) => entry.type === "ObjectProperty")
              .map((entry) => keyName(entry.key as Expression))
              .filter((name): name is string => Boolean(name))
          : [],
      ),
    );
  }

  return info;
}

function readActions(path: string): ActionsInfo {
  const info: ActionsInfo = {
    exists: existsSync(path),
    handlers: new Map(),
    unknown: new Set(),
  };
  if (!info.exists) return info;

  const program = parse(readFileSync(path, "utf8"), {
    sourceType: "module",
    plugins: ["typescript"],
  }).program;

  let object: ObjectExpression | undefined;
  for (const node of program.body) {
    const declaration =
      node.type === "VariableDeclaration"
        ? node
        : node.type === "ExportNamedDeclaration" &&
            node.declaration?.type === "VariableDeclaration"
          ? node.declaration
          : undefined;
    if (!declaration) continue;

    for (const declarator of declaration.declarations) {
      if (
        declarator.id.type === "Identifier" &&
        declarator.id.name === "resourceActions"
      ) {
        object = asObject(declarator.init as Expression | undefined);
      }
    }
  }

  if (object) {
    for (const property of object.properties) {
      if (property.type !== "ObjectProperty") continue;
      const model = keyName(property.key as Expression);
      if (!model) continue;

      const value = asObject(property.value as Expression);
      if (!value) {
        info.unknown.add(model);
        continue;
      }

      info.handlers.set(
        model,
        new Set(
          value.properties
            .filter((entry) => entry.type === "ObjectProperty")
            .map((entry) => keyName(entry.key as Expression))
            .filter((name): name is string => Boolean(name)),
        ),
      );
    }
  }

  // `dashild make:action` appends `resourceActions.Customer = { export }`
  // assignments after the registry literal; both shapes are valid.
  for (const node of program.body) {
    if (node.type !== "ExpressionStatement") continue;
    const expression = node.expression;
    if (expression.type !== "AssignmentExpression") continue;
    if (expression.left.type !== "MemberExpression") continue;

    const { object: owner, property } = expression.left;
    if (owner.type !== "Identifier" || owner.name !== "resourceActions") {
      continue;
    }

    const model = keyName(property as Expression);
    const value = asObject(expression.right);
    if (!model || !value) continue;

    const handlers = info.handlers.get(model) ?? new Set<string>();
    for (const entry of value.properties) {
      if (entry.type !== "ObjectProperty") continue;
      const name = keyName(entry.key as Expression);
      if (name) handlers.add(name);
    }
    info.handlers.set(model, handlers);
  }

  return info;
}

export function runDoctor(options: {
  cwd: string;
  metadata?: string;
  dir: string;
  policies?: string;
  actions?: string;
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

  const policiesPath = options.policies
    ? resolve(options.cwd, options.policies)
    : join(dirname(directory), "policies.ts");
  const actionsPath = options.actions
    ? resolve(options.cwd, options.actions)
    : join(dirname(directory), "actions/index.ts");
  const policies = readPolicies(policiesPath);
  const actions = readActions(actionsPath);
  const policiesFile = relative(options.cwd, policiesPath);
  const actionsFile = relative(options.cwd, actionsPath);

  for (const resource of resources) {
    if (!resource.model) continue;

    if (!policies.exists) {
      resource.issues.push({
        severity: "error",
        file: policiesFile,
        message:
          "policies.ts not found; the runtime will deny this resource.",
        suggestion:
          "Add an entry for the model in src/dashild/policies.ts.",
      });
    } else if (!policies.models.has(resource.model)) {
      resource.issues.push({
        severity: "error",
        file: policiesFile,
        message: `No policy entry for model "${resource.model}".`,
        suggestion:
          "Add the model to policies.ts with its scope and permissions.",
      });
    }

    for (const action of resource.actions) {
      if (!actions.exists) {
        resource.issues.push({
          severity: "warning",
          file: actionsFile,
          message: `Action "${action.name}" has no handler file.`,
          suggestion:
            "Create src/dashild/actions/index.ts or remove the action.",
        });
        continue;
      }

      if (
        !actions.unknown.has(resource.model) &&
        !actions.handlers.get(resource.model)?.has(action.name)
      ) {
        resource.issues.push({
          severity: "error",
          file: actionsFile,
          message: `Action "${action.name}" has no handler for ${resource.model}.`,
          suggestion:
            "Register the handler in resourceActions or remove the action.",
        });
      }

      if (action.requires) {
        const can = policies.can.get(resource.model);
        if (policies.exists && can && !can.has(action.requires)) {
          resource.issues.push({
            severity: "error",
            file: policiesFile,
            message: `Action "${action.name}" requires policy "${action.requires}", but ${resource.model} does not declare it.`,
            suggestion:
              "Add the predicate under the model's can object in policies.ts.",
          });
        }
      }
    }
  }

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
