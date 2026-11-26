import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

export interface MakeActionOptions {
  cwd: string;
  /** Actions folder, relative to cwd. */
  dir?: string;
  model: string;
  action: string;
}

export interface MakeActionResult {
  path: string;
  created: boolean;
}

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Appends a typed handler stub to the existing `actions/index.ts`.
 *
 * It does not touch the resource file (write-once): the action still has to be
 * declared in `table.actions` or `form.actions`, which is data the developer
 * owns.
 */
export function makeAction(options: MakeActionOptions): MakeActionResult {
  if (!NAME.test(options.model)) {
    throw new Error(`Invalid model name: ${options.model}`);
  }
  if (!NAME.test(options.action)) {
    throw new Error(`Invalid action name: ${options.action}`);
  }

  const path = resolve(
    options.cwd,
    options.dir ?? "src/dashild/actions",
    "index.ts",
  );

  if (!existsSync(path)) {
    throw new Error(
      `Actions file not found at ${relative(options.cwd, path)}. Run dashild init first or pass --dir.`,
    );
  }

  const source = readFileSync(path, "utf8");
  if (!/\bresourceActions\b/.test(source)) {
    throw new Error(
      "actions/index.ts has no resourceActions registry; add it or edit the handlers by hand.",
    );
  }

  const marker = `dashild make:action:${options.model}:${options.action}`;
  if (source.includes(marker)) {
    return { path, created: false };
  }

  const block = `
// ${marker}
resourceActions.${options.model} = {
  ...resourceActions.${options.model},
  ${options.action}: async (_context) => ({
    ok: true,
    message: "TODO: implement ${options.model}.${options.action}",
  }),
};
`;

  writeFileSync(path, `${source.replace(/\s*$/, "\n")}${block}`, "utf8");
  return { path, created: true };
}
