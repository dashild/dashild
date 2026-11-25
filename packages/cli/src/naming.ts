/**
 * Names derived from the model.
 *
 * The scaffold does not invent labels: it derives `label`, `slug`, file name
 * and export name from the model. The developer edits them afterwards; the
 * file belongs to the app.
 */

export function humanize(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function kebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

export function camel(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function pluralizeWord(word: string): string {
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

/** `BlogPost` → `blog-posts`; `Category` → `categories`. */
export function resourceSlug(model: string): string {
  return kebab(pluralizeWord(model));
}

/** `BlogPost` → `Blog Posts`; `User` → `Users`. */
export function resourceLabel(model: string): string {
  const words = humanize(model).split(" ");
  const last = words[words.length - 1] ?? model;
  words[words.length - 1] = pluralizeWord(last);
  return words.join(" ");
}

/** `BlogPost` → `blog-post.ts` (singular, like the hand-written file). */
export function resourceFileName(model: string): string {
  return `${kebab(model)}.ts`;
}

/** `BlogPost` → `blogPostResource`. */
export function resourceExportName(model: string): string {
  return `${camel(model)}Resource`;
}
