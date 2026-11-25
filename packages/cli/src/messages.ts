import type { Locale } from "@dashild/core";

/**
 * CLI message catalog.
 *
 * The CLI is a process, so its locale comes from `--lang` or `DASHILD_LANG`,
 * never from a request or a cookie. English is the default.
 */

const en = {
  "resource.created": "Created {path}",
  "resource.exists": "{path} already exists; not overwritten.",
  "metadata.notFound":
    "Cannot find dashild-metadata.json. Tried: {paths}. Run `prisma generate` or pass --metadata <path>.",
  "metadata.read": "Could not read {path}: {error}.",
  "metadata.version":
    "Metadata formatVersion is {found}; this CLI expects {expected}. Run prisma generate again.",
  "model.notFound":
    'Model "{model}" is not in the metadata. Available: {models}.',
  "command.pending": '"{name}" is not implemented yet ({block}).',
  "cli.usage": "Usage: dashild <command>",

  "init.notNext":
    "No Next.js dependency found in {path}. Run this command inside a Next.js app.",
  "init.exists": "{path} already exists. Use --force to overwrite it.",
  "init.plan": "Files Dashild will write:",
  "init.routeConflict":
    "A page already exists at {path}; using /{route} for the panel.",
  "init.warning.prisma":
    "Could not find a Prisma client module; runtime.ts imports {path}. Adjust it after init.",
  "init.warning.deps":
    "Missing dependencies: {packages}. Install them before running the panel.",
  "init.applyHint": "Run `dashild init --yes` to write these files.",
  "init.written": "Wrote {path}",
  "init.script": "Added the dashild script to package.json",
  "init.done":
    "Done. Complete the auth adapter in {panel} and add your resources.",
  "init.done.better-auth":
    "Done. Better Auth is wired in {panel}. Set BETTER_AUTH_SECRET and add your resources.",
  "init.metadata":
    "dashild-metadata.json is required. Run `prisma generate` first or pass --metadata <path>.",
  "init.auth.invalid":
    'Unknown auth provider "{provider}". Use "none" or "better-auth".',
  "init.auth.models":
    "Found existing auth models ({models}) in {path}; not modifying the schema. Adapt them to Better Auth manually.",
  "init.auth.schemaMissing":
    "Could not find schema.prisma; Better Auth models were not added.",
  "init.auth.secret":
    "BETTER_AUTH_SECRET is empty. Generate one with `openssl rand -base64 32`.",
} as const;

type MessageKey = keyof typeof en;

const es: Record<MessageKey, string> = {
  "resource.created": "Creado {path}",
  "resource.exists": "{path} ya existe; no se sobrescribe.",
  "metadata.notFound":
    "No encuentro dashild-metadata.json. Rutas probadas: {paths}. Ejecuta `prisma generate` o pasa --metadata <path>.",
  "metadata.read": "No se pudo leer {path}: {error}.",
  "metadata.version":
    "Los metadatos tienen formatVersion {found}; esta CLI espera {expected}. Vuelve a ejecutar prisma generate.",
  "model.notFound":
    'El modelo "{model}" no está en los metadatos. Disponibles: {models}.',
  "command.pending": '"{name}" no implementado todavía ({block}).',
  "cli.usage": "Uso: dashild <comando>",

  "init.notNext":
    "No encuentro Next.js en {path}. Ejecuta el comando dentro de una app Next.js.",
  "init.exists": "{path} ya existe. Usa --force para sobrescribirlo.",
  "init.plan": "Archivos que Dashild va a escribir:",
  "init.routeConflict":
    "Ya existe una página en {path}; el panel usará /{route}.",
  "init.warning.prisma":
    "No encuentro un módulo de cliente Prisma; runtime.ts importa {path}. Ajústalo después de init.",
  "init.warning.deps":
    "Faltan dependencias: {packages}. Instálalas antes de arrancar el panel.",
  "init.applyHint": "Ejecuta `dashild init --yes` para escribir estos archivos.",
  "init.written": "Escrito {path}",
  "init.script": "Script dashild añadido a package.json",
  "init.done":
    "Hecho. Completa el adaptador de autenticación en {panel} y añade tus recursos.",
  "init.done.better-auth":
    "Hecho. Better Auth está conectado en {panel}. Configura BETTER_AUTH_SECRET y añade tus recursos.",
  "init.metadata":
    "dashild-metadata.json es obligatorio. Ejecuta `prisma generate` antes o pasa --metadata <path>.",
  "init.auth.invalid":
    'Proveedor de auth desconocido: "{provider}". Usa "none" o "better-auth".',
  "init.auth.models":
    "Ya existen modelos de auth ({models}) en {path}; no modifico el schema. Adáptalos a Better Auth a mano.",
  "init.auth.schemaMissing":
    "No encuentro schema.prisma; no se añadieron los modelos de Better Auth.",
  "init.auth.secret":
    "BETTER_AUTH_SECRET está vacío. Genera uno con `openssl rand -base64 32`.",
};

export function resolveCliLocale(value: string | undefined): Locale {
  return value === "es" ? "es" : "en";
}

export function cliMessage(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const template = (locale === "es" ? es : en)[key] ?? en[key];

  return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
    String(params?.[name] ?? ""),
  );
}
