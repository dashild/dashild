#!/usr/bin/env node
/**
 * Dashild's official Prisma generator.
 *
 * Prisma runs it as a child process during `prisma generate` and passes the
 * DMMF over stdio. It does not generate resources or pages: it writes a single
 * artifact, `dashild-metadata.json`, which feeds the scaffold, server
 * validation, query includes and `dashild doctor`.
 *
 * Declared in `schema.prisma`:
 *
 *   generator dashild {
 *     provider = "dashild-prisma-generator"
 *     output   = "../src/generated/dashild"
 *   }
 *
 * Provider resolution: Prisma does not resolve `provider` as a Node module. It
 * executes the string with `/bin/sh`, so `provider` must be an executable on
 * the `PATH`. That works because the package publishes a `bin` with the same
 * name and npm/pnpm add `node_modules/.bin` to `PATH` when running scripts.
 * Running `prisma generate` without that `PATH` fails with an explicit error
 * (`dashild-prisma-generator: command not found`).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

import type { GeneratorOptions } from "@prisma/generator-helper";

import { extractMetadata } from "./extract.js";

/**
 * `@prisma/generator-helper` is CommonJS and does not expose
 * `generatorHandler` as a named ESM export. It is loaded with `createRequire`
 * instead of a static import: the only form that works with NodeNext and
 * Prisma 7.
 */
type GeneratorHelperModule = typeof import("@prisma/generator-helper");
const { generatorHandler } = createRequire(import.meta.url)(
  "@prisma/generator-helper",
) as GeneratorHelperModule;

const OUTPUT_FILE = "dashild-metadata.json";

generatorHandler({
  onManifest() {
    return {
      prettyName: "Dashild",
      defaultOutput: "./dashild",
      version: "0.0.0",
    };
  },

  async onGenerate(options) {
    const outputDir = options.generator.output?.value;
    if (!outputDir) {
      throw new Error(
        "Dashild: missing `output` in the `generator dashild` block.",
      );
    }

    const metadata = extractMetadata(options);
    const target = join(outputDir, OUTPUT_FILE);

    await mkdir(outputDir, { recursive: true });
    await writeFile(
      target,
      `${JSON.stringify(metadata, jsonReplacer, 2)}\n`,
      "utf8",
    );

    // Informational: Prisma shows it in `generate` output.
    process.stderr.write(
      `dashild: ${metadata.models.length} models, ${metadata.enums.length} enums → ${target}\n`,
    );
  },
});

/**
 * A `@default(9007199254740993n)` or a `Decimal` may arrive as BigInt and
 * `JSON.stringify` would throw. It is normalized to a string: the metadata is
 * diagnostic and is never used to rebuild the value.
 */
function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
