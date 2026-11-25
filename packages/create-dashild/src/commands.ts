import { spawn } from "node:child_process";

import type { PackageManager } from "./types.js";

export interface CommandSpec {
  command: string;
  args: string[];
}

function shell(): boolean {
  return process.platform === "win32";
}

export function runCommand(
  spec: CommandSpec,
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    /** `ignore` keeps a probe's failure output out of the log. */
    stdio?: "inherit" | "ignore";
  },
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(spec.command, spec.args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.stdio ?? "inherit",
      shell: shell(),
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(
        new Error(
          `${spec.command} ${spec.args.join(" ")} exited with code ${code}`,
        ),
      );
    });
  });
}

export function createNextAppCommand(
  packageManager: PackageManager,
  dir: string,
): CommandSpec {
  const args = [
    "create-next-app@latest",
    dir,
    "--ts",
    "--tailwind",
    "--eslint",
    "--app",
    "--src-dir",
    "--empty",
    "--import-alias",
    "@/*",
    "--disable-git",
    "--skip-install",
    `--use-${packageManager}`,
    "--yes",
  ];

  switch (packageManager) {
    case "pnpm":
      return { command: "pnpm", args: ["dlx", ...args] };
    case "yarn":
      return { command: "yarn", args: ["dlx", ...args] };
    case "bun":
      return { command: "bunx", args };
    default:
      return { command: "npx", args };
  }
}

/** The command a user types to run a package.json script. */
export function scriptCommand(
  packageManager: PackageManager,
  script: string,
): string {
  switch (packageManager) {
    case "npm":
      return `npm run ${script}`;
    case "bun":
      return `bun run ${script}`;
    default:
      return `${packageManager} ${script}`;
  }
}

export function installCommand(packageManager: PackageManager): CommandSpec {
  switch (packageManager) {
    case "pnpm":
      return { command: "pnpm", args: ["install"] };
    case "yarn":
      return { command: "yarn", args: ["install"] };
    case "bun":
      return { command: "bun", args: ["install"] };
    default:
      return { command: "npm", args: ["install"] };
  }
}

export function execCommand(
  packageManager: PackageManager,
  bin: string,
  args: string[],
): CommandSpec {  switch (packageManager) {
    case "pnpm":
      return { command: "pnpm", args: ["exec", bin, ...args] };
    case "bun":
      return { command: "bunx", args: [bin, ...args] };
    case "yarn":
      return { command: "npx", args: [bin, ...args] };
    default:
      return { command: "npx", args: [bin, ...args] };
  }
}

/**
 * Re-run a native dependency's install script.
 *
 * Native bindings are compiled for the Node that runs the script, so the
 * rebuild has to happen under the same Node that will run the app.
 */
export function rebuildCommand(
  packageManager: PackageManager,
  dependency: string,
): CommandSpec {
  switch (packageManager) {
    case "pnpm":
      return { command: "pnpm", args: ["rebuild", dependency] };
    case "yarn":
      return { command: "yarn", args: ["install", "--force"] };
    case "bun":
      return { command: "bun", args: ["install", "--force"] };
    default:
      return {
        command: "npm",
        args: ["rebuild", dependency, "--foreground-scripts"],
      };
  }
}
