#!/usr/bin/env node
/**
 * Concatenates the English docs into public/llms-full.txt.
 *
 * Runs before `astro build`, so the deployed site serves a single file for
 * assistants that cannot follow links. Spanish pages are skipped: /es mirrors
 * the same content.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = join(root, "src/content/docs");
const output = join(root, "public/llms-full.txt");

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "es") continue;
      files.push(...walk(path));
      continue;
    }
    if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) {
      files.push(path);
    }
  }
  return files;
}

function parse(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { title: null, body: source };
  const title = match[1].match(/^title:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g, "");
  return { title: title ?? null, body: source.slice(match[0].length) };
}

const pages = walk(docs)
  .map((path) => {
    const source = readFileSync(path, "utf8");
    const { title, body } = parse(source);
    return {
      path: relative(docs, path).replace(/\\/g, "/"),
      title,
      body: body.trim(),
    };
  })
  .sort((left, right) => left.path.localeCompare(right.path));

const header = `# Dashild documentation (full text)

Source: https://dashild.vercel.app
Skill: pnpm dashild skill install
Generated from apps/docs/src/content/docs (English pages).

`;

const body = pages
  .map(
    (page) =>
      `\n\n---\n\n# ${page.title ?? page.path}\n\nSource: https://dashild.vercel.app/${page.path.replace(/(^|\/)index\.mdx?$/, "$1").replace(/\.mdx?$/, "/")}\n\n${page.body}`,
  )
  .join("");

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${header}${body.trim()}\n`, "utf8");
console.log(`llms-full.txt: ${pages.length} pages`);
