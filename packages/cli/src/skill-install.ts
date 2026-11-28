import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type SkillAgent = "claude" | "opencode";
export type SkillAgentOption = SkillAgent | "both";

export interface SkillInstallOptions {
  cwd: string;
  agent?: SkillAgentOption;
  /** Test hook: skill folder to copy. */
  source?: string;
}

export interface SkillInstallResult {
  agents: SkillAgent[];
  /** Paths relative to the project. */
  files: string[];
  agentsFile: string;
}

const DESTINATIONS: Record<SkillAgent, string> = {
  claude: ".claude/skills/dashild",
  opencode: ".opencode/skills/dashild",
};

const BEGIN = "<!-- dashild:skill:begin -->";
const END = "<!-- dashild:skill:end -->";

function sourceFolder(): string {
  for (const candidate of [
    new URL("../skills/dashild", import.meta.url),
    new URL("../../skills/dashild", import.meta.url),
  ]) {
    const path = fileURLToPath(candidate);
    if (existsSync(resolve(path, "SKILL.md"))) return path;
  }
  throw new Error(
    "The Dashild skill was not found in the installed CLI. Reinstall @dashild/cli.",
  );
}

function listFiles(directory: string, prefix = ""): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listFiles(resolve(directory, entry.name), relative));
    } else {
      files.push(relative);
    }
  }
  return files.sort();
}

function agentsBlock(agents: SkillAgent[]): string {
  const paths = agents
    .map((agent) => `- \`${DESTINATIONS[agent]}/SKILL.md\``)
    .join("\n");

  return `${BEGIN}
## Dashild

This app uses Dashild for its admin panel. Read the Dashild skill before
changing resources, policies, actions, or the Prisma schema:

${paths}

Verify every change with \`pnpm dashild doctor\` and \`pnpm build\`.
${END}`;
}

/**
 * Copies the bundled Dashild skill into the project's agent folders and adds a
 * short pointer to AGENTS.md. Idempotent: reinstalling replaces the skill and
 * refreshes the block instead of appending duplicates.
 */
export function skillInstall(options: SkillInstallOptions): SkillInstallResult {
  const cwd = resolve(options.cwd);
  const source = options.source ?? sourceFolder();
  if (!existsSync(resolve(source, "SKILL.md"))) {
    throw new Error(`Skill not found at ${source}`);
  }

  const requested = options.agent ?? "both";
  const agents: SkillAgent[] =
    requested === "both" ? ["claude", "opencode"] : [requested];

  const files: string[] = [];
  for (const agent of agents) {
    const destination = resolve(cwd, DESTINATIONS[agent]);
    cpSync(source, destination, { recursive: true, force: true });
    for (const file of listFiles(source)) {
      files.push(`${DESTINATIONS[agent]}/${file}`);
    }
  }

  const agentsFile = resolve(cwd, "AGENTS.md");
  const current = existsSync(agentsFile) ? readFileSync(agentsFile, "utf8") : "";
  const block = agentsBlock(agents);
  let next: string;

  if (current.includes(BEGIN) && current.includes(END)) {
    next = current.replace(
      new RegExp(`${BEGIN}[\\s\\S]*?${END}`),
      block,
    );
  } else {
    next = `${current.trimEnd()}${current.trim() ? "\n\n" : ""}${block}\n`;
  }

  writeFileSync(agentsFile, next, "utf8");

  return { agents, files, agentsFile: "AGENTS.md" };
}
