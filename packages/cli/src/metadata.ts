import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import {
  METADATA_FORMAT_VERSION,
  type DashildMetadata,
  type Locale,
} from "@dashild/core";

import { cliMessage } from "./messages.js";

const DEFAULT_CANDIDATES = [
  "src/generated/dashild/dashild-metadata.json",
  "generated/dashild/dashild-metadata.json",
  "prisma/generated/dashild/dashild-metadata.json",
];

export function findMetadata(
  cwd: string,
  explicit: string | undefined,
  locale: Locale,
): string {
  const candidates = explicit
    ? [isAbsolute(explicit) ? explicit : resolve(cwd, explicit)]
    : DEFAULT_CANDIDATES.map((candidate) => resolve(cwd, candidate));

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      cliMessage(locale, "metadata.notFound", {
        paths: candidates.join(", "),
      }),
    );
  }

  return found;
}

export function readMetadata(path: string, locale: Locale): DashildMetadata {
  let parsed: DashildMetadata;

  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as DashildMetadata;
  } catch (error) {
    throw new Error(
      cliMessage(locale, "metadata.read", {
        path,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  if (parsed.formatVersion !== METADATA_FORMAT_VERSION) {
    throw new Error(
      cliMessage(locale, "metadata.version", {
        found: parsed.formatVersion,
        expected: METADATA_FORMAT_VERSION,
      }),
    );
  }

  return parsed;
}
