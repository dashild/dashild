/**
 * Adds a generated resource to `panel.ts` and `policies.ts`.
 *
 * It parses both files instead of importing them: the panel pulls Next modules
 * and policies may pull the app's session types. The edit is deliberately
 * small and idempotent; the resource and its policy remain developer-owned.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { parse } from "@babel/parser";
import type {
  CallExpression,
  Expression,
  ObjectExpression,
  Program,
} from "@babel/types";

export interface RegisterResourceInput {
  panelPath: string;
  policiesPath: string;
  resourceFile: string;
  exportName: string;
  model: string;
}

export interface RegisterResourceResult {
  panelUpdated: boolean;
  policiesUpdated: boolean;
  warnings: string[];
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

function keyName(key: Expression): string | undefined {
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
    if (keyName(property.key as Expression) === name) {
      return property.value as Expression;
    }
  }
  return undefined;
}

function asObject(value: Expression | undefined): ObjectExpression | undefined {
  return value?.type === "ObjectExpression" ? value : undefined;
}

function findCall(program: Program, name: string): CallExpression | undefined {
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

function parseFile(path: string): { source: string; program: Program } {
  const source = readFileSync(path, "utf8");
  return {
    source,
    program: parse(source, {
      sourceType: "module",
      plugins: ["typescript"],
    }).program,
  };
}

function applyEdits(source: string, edits: Edit[]): string {
  const ordered = [...edits].sort((left, right) => right.start - left.start);
  let result = source;

  for (const edit of ordered) {
    result =
      result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }

  return result;
}

function moduleSpecifier(from: string, to: string): string {
  const path = relative(dirname(from), to)
    .replace(/\\/g, "/")
    .replace(/\.(tsx?|jsx?)$/, "");
  return path.startsWith(".") ? path : `./${path}`;
}

function hasImport(program: Program, exportName: string): boolean {
  return program.body.some(
    (node) =>
      node.type === "ImportDeclaration" &&
      node.specifiers.some(
        (specifier) =>
          specifier.type === "ImportSpecifier" &&
          specifier.local.name === exportName,
      ),
  );
}

function lastImportEnd(program: Program): number {
  const imports = program.body.filter(
    (node) => node.type === "ImportDeclaration",
  );
  const end = imports.at(-1)?.end;
  return typeof end === "number" ? end : 0;
}

function panelEdits(
  source: string,
  program: Program,
  input: RegisterResourceInput,
  warnings: string[],
): Edit[] {
  const call = findCall(program, "definePanel");
  if (!call) {
    warnings.push("panel.ts has no definePanel({...}) call; resource not registered.");
    return [];
  }

  const definition = asObject(call.arguments[0] as Expression | undefined);
  const resources = definition
    ? objectProperty(definition, "resources")
    : undefined;

  if (!resources || resources.type !== "ArrayExpression") {
    warnings.push("panel.ts has no resources array; resource not registered.");
    return [];
  }

  const alreadyListed = resources.elements.some(
    (element) =>
      element?.type === "Identifier" && element.name === input.exportName,
  );
  if (alreadyListed) return [];

  const edits: Edit[] = [];

  if (resources.elements.length === 0) {
    edits.push({
      start: resources.start! + 1,
      end: resources.start! + 1,
      text: `\n    ${input.exportName},\n  `,
    });
  } else {
    edits.push({
      start: resources.end! - 1,
      end: resources.end! - 1,
      text: `, ${input.exportName}`,
    });
  }

  if (!hasImport(program, input.exportName)) {
    const specifier = moduleSpecifier(input.panelPath, input.resourceFile);
    edits.push({
      start: lastImportEnd(program),
      end: lastImportEnd(program),
      text: `\nimport { ${input.exportName} } from ${JSON.stringify(specifier)};`,
    });
  }

  return edits;
}

function policiesEdits(
  source: string,
  program: Program,
  input: RegisterResourceInput,
  warnings: string[],
): Edit[] {
  const call = findCall(program, "definePolicies");
  if (!call) {
    warnings.push(
      "policies.ts has no definePolicies({...}) call; policy not registered.",
    );
    return [];
  }

  const definition = asObject(call.arguments[0] as Expression | undefined);
  const resources = definition
    ? asObject(objectProperty(definition, "resources"))
    : undefined;

  if (!resources) {
    warnings.push("policies.ts has no resources object; policy not registered.");
    return [];
  }

  const alreadyListed = resources.properties.some(
    (property) =>
      property.type === "ObjectProperty" &&
      keyName(property.key as Expression) === input.model,
  );
  if (alreadyListed) return [];

  const entry = `${input.model}: {
      // Fail closed until you define the scope and permissions.
      scope: () => null,
    },`;

  if (resources.properties.length === 0) {
    return [
      {
        start: resources.start! + 1,
        end: resources.start! + 1,
        text: `\n    ${entry}\n  `,
      },
    ];
  }

  const last = resources.properties.at(-1);
  if (!last) return [];

  const lastEnd = last.end ?? 0;
  const close = (resources.end ?? source.length) - 1;
  const hasComma = source.slice(lastEnd, close).includes(",");
  return [
    {
      start: close,
      end: close,
      text: `${hasComma ? "" : ","}\n    ${entry}\n  `,
    },
  ];
}

export function registerResource(
  input: RegisterResourceInput,
): RegisterResourceResult {
  const warnings: string[] = [];
  let panelUpdated = false;
  let policiesUpdated = false;

  if (!existsSync(input.panelPath)) {
    warnings.push("panel.ts not found; resource not registered.");
  } else {
    try {
      const { source, program } = parseFile(input.panelPath);
      const edits = panelEdits(source, program, input, warnings);
      if (edits.length > 0) {
        writeFileSync(input.panelPath, applyEdits(source, edits), "utf8");
        panelUpdated = true;
      }
    } catch (error) {
      warnings.push(
        `Could not parse panel.ts: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (!existsSync(input.policiesPath)) {
    warnings.push("policies.ts not found; policy not registered.");
  } else {
    try {
      const { source, program } = parseFile(input.policiesPath);
      const edits = policiesEdits(source, program, input, warnings);
      if (edits.length > 0) {
        writeFileSync(input.policiesPath, applyEdits(source, edits), "utf8");
        policiesUpdated = true;
      }
    } catch (error) {
      warnings.push(
        `Could not parse policies.ts: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return { panelUpdated, policiesUpdated, warnings };
}
