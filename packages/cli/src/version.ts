import { readFileSync } from "node:fs";

/** The installed CLI version, written into generated glue as a marker. */
function readVersion(): string {
  for (const candidate of ["../package.json", "../../package.json"]) {
    try {
      const parsed = JSON.parse(
        readFileSync(new URL(candidate, import.meta.url), "utf8"),
      ) as { version?: string };
      if (parsed.version) return parsed.version;
    } catch {
      // Source tree vs dist: try the next location.
    }
  }
  return "0.0.0";
}

export const CLI_VERSION = readVersion();
