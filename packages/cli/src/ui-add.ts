/**
 * `dashild ui:add`: copies a small cell/field template into the app.
 *
 * The template is app code after this point. Registration stays explicit in
 * `src/dashild/registry.tsx`, because the import alias and component name are
 * the developer's choice.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

export interface UiTemplate {
  name: string;
  kind: "cell" | "field";
  fileName: string;
  content: string;
}

const AVATAR_CELL = `"use client";

import type { CellRendererProps } from "@dashild/admin";

import { Avatar, AvatarFallback } from "@dashild/admin/ui/avatar";

/** Custom cell. Register it with registerCell("avatar", AvatarCell). */
export function AvatarCell({ value }: CellRendererProps) {
  const label = String(value ?? "");
  return (
    <span className="flex items-center gap-2">
      <Avatar className="size-6">
        <AvatarFallback className="text-[0.65rem]">
          {label.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span>{label}</span>
    </span>
  );
}
`;

const EMAIL_FIELD = `"use client";

import type { FieldRendererProps } from "@dashild/admin";

import { FieldDescription } from "@dashild/admin/ui/field";
import { Input } from "@dashild/admin/ui/input";

/** Custom field. Register it with registerField("email", EmailField). */
export function EmailField({
  id,
  name,
  value,
  onChange,
  onBlur,
}: FieldRendererProps) {
  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        name={name}
        type="email"
        autoComplete="email"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <FieldDescription>
        A valid email address for this account.
      </FieldDescription>
    </div>
  );
}
`;

export const UI_TEMPLATES: Record<string, UiTemplate> = {
  "avatar-cell": {
    name: "avatar",
    kind: "cell",
    fileName: "avatar-cell.tsx",
    content: AVATAR_CELL,
  },
  "email-field": {
    name: "email",
    kind: "field",
    fileName: "email-field.tsx",
    content: EMAIL_FIELD,
  },
};

export interface UiAddOptions {
  cwd: string;
  dir: string;
  names: string[];
  force?: boolean;
  dryRun?: boolean;
  write?: (path: string, content: string) => void;
}

export interface UiAddResult {
  created: string[];
  skipped: string[];
  unknown: string[];
}

export function uiAdd(options: UiAddOptions): UiAddResult {
  const directory = resolve(options.cwd, options.dir);
  const created: string[] = [];
  const skipped: string[] = [];
  const unknown: string[] = [];
  const write =
    options.write ??
    ((path: string, content: string) => {
      mkdirSync(directory, { recursive: true });
      writeFileSync(path, content, "utf8");
    });

  for (const name of options.names) {
    const template = UI_TEMPLATES[name];
    if (!template) {
      unknown.push(name);
      continue;
    }

    const target = resolve(directory, template.fileName);
    const label = relative(options.cwd, target);

    if (existsSync(target) && !options.force) {
      skipped.push(label);
      continue;
    }

    if (options.dryRun) {
      created.push(label);
      continue;
    }

    write(target, template.content);
    created.push(label);
  }

  return { created, skipped, unknown };
}

export function formatUiRegistration(name: string): string {
  const template = UI_TEMPLATES[name];
  if (!template) return "";
  const register = template.kind === "cell" ? "registerCell" : "registerField";
  return `Register it in src/dashild/registry.tsx with ${register}("${template.name}", <Component>).`;
}
