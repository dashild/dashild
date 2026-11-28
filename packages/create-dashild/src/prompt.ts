import * as p from "@clack/prompts";

import { t } from "./messages.js";
import {
  DATABASES,
  PACKAGE_MANAGERS,
  defaultDatabaseUrl,
  detectPackageManager,
  inferProvider,
  isValidProjectName,
  looksPooled,
  normalizePanelPath,
  providerMatchesUrl,
  resolveTargetDir,
} from "./options.js";
import type {
  AuthProvider,
  CreateOptions,
  DatabaseProvider,
  Locale,
  PackageManager,
} from "./types.js";

export interface PromptFlags {
  name?: string;
  dir?: string;
  template?: string;
  auth?: AuthProvider;
  database?: DatabaseProvider;
  databaseUrl?: string;
  directUrl?: string;
  packageManager?: PackageManager;
  install?: boolean;
  git?: boolean;
  migrate?: boolean;
  seed?: boolean;
  panelPath?: string;
  locale: Locale;
  yes: boolean;
  tenancy?: boolean;
}

function cancel(): never {
  throw new CancelledError();
}

export class CancelledError extends Error {
  constructor() {
    super("cancelled");
    this.name = "CancelledError";
  }
}

function guard<T>(value: unknown): T {
  if (p.isCancel(value)) cancel();
  return value as T;
}

export async function promptOptions(
  flags: PromptFlags,
): Promise<CreateOptions> {
  const { locale } = flags;
  const interactive =
    !flags.yes && Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);

  async function text(options: {
    message: string;
    placeholder?: string;
    initialValue?: string;
    defaultValue?: string;
    validate?: (value: string) => string | undefined;
  }): Promise<string> {
    return guard<string>(
      await p.text({
        message: options.message,
        placeholder: options.placeholder,
        initialValue: options.initialValue,
        defaultValue: options.defaultValue,
        validate: (value) => options.validate?.(value ?? ""),
      }),
    );
  }

  async function confirm(message: string, initialValue: boolean): Promise<boolean> {
    if (!interactive) return initialValue;
    return guard<boolean>(
      await p.confirm({ message, initialValue }),
    );
  }

  async function choose<T extends string>(
    message: string,
    options: { value: T; label?: string; hint?: string }[],
  ): Promise<T> {
    if (!interactive) return options[0]!.value;
    return guard<T>(
      await p.select({ message, options: options as never }),
    );
  }

  let name = flags.name;
  if (name !== undefined && !isValidProjectName(name)) {
    throw new Error(t(locale, "invalidName"));
  }

  if (!name) {
    if (!interactive) throw new Error(t(locale, "missingName"));
    name = await text({
      message: t(locale, "name"),
      placeholder: t(locale, "namePlaceholder"),
      validate: (value) =>
        isValidProjectName(value.trim()) ? undefined : t(locale, "invalidName"),
    });
  }

  name = name.trim();
  if (!name) throw new Error(t(locale, "missingName"));

  const dir = resolveTargetDir(process.cwd(), name, flags.dir);

  let template = flags.template;
  if (!template) {
    if (!interactive) {
      template = "basic";
    } else {
      const choice = await choose<"basic" | "blog" | "demo" | "saas" | "__other">(
        t(locale, "template"),
        [
          { value: "basic", label: t(locale, "templateBasic") },
          { value: "blog", label: t(locale, "templateBlog") },
          { value: "demo", label: t(locale, "templateDemo") },
          { value: "saas", label: t(locale, "templateSaas") },
          { value: "__other", label: t(locale, "templateOther") },
        ],
      );
      template =
        choice === "__other"
          ? await text({
              message: t(locale, "templateSpec"),
              placeholder: t(locale, "templateSpecPlaceholder"),
              validate: (value) =>
                value.trim() ? undefined : t(locale, "templateNotFound", {
                  spec: "",
                }),
            })
          : choice;
    }
  }
  template = template.trim();
  if (!template) {
    throw new Error(t(locale, "templateNotFound", { spec: "" }));
  }

  let auth = flags.auth;
  if (auth === undefined) {
    auth = interactive
      ? await choose<AuthProvider>(t(locale, "auth"), [
          { value: "better-auth", label: t(locale, "authBetter") },
          { value: "none", label: t(locale, "authNone") },
        ])
      : "better-auth";
  }

  if (auth !== "better-auth" && auth !== "none") {
    throw new Error(t(locale, "authInvalid"));
  }

  if (
    (template === "blog" || template === "demo" || template === "saas") &&
    auth === "none"
  ) {
    if (!interactive) {
      throw new Error(t(locale, "templateAuth", { auth: "better-auth" }));
    }
    p.log.warn(t(locale, "templateAuth", { auth: "better-auth" }));
    auth = "better-auth";
  }

  const tenancy = template === "saas" || flags.tenancy === true;

  if (tenancy && auth !== "better-auth") {
    if (!interactive) {
      throw new Error(t(locale, "templateAuth", { auth: "better-auth" }));
    }
    p.log.warn(t(locale, "templateAuth", { auth: "better-auth" }));
    auth = "better-auth";
  }

  let database = flags.database;
  if (database === undefined && flags.databaseUrl) {
    database = inferProvider(flags.databaseUrl);
  }
  if (database === undefined) {
    database = interactive
      ? await choose<DatabaseProvider>(t(locale, "database"), [
          { value: "postgresql", label: t(locale, "dbPostgres") },
          { value: "mysql", label: t(locale, "dbMysql") },
          { value: "sqlite", label: t(locale, "dbSqlite") },
        ])
      : "postgresql";
  }

  if (!DATABASES.includes(database)) {
    throw new Error(t(locale, "dbInvalid"));
  }

  let databaseUrl = flags.databaseUrl;
  if (databaseUrl === undefined) {
    if (!interactive) {
      databaseUrl = defaultDatabaseUrl(database);
    } else {
      databaseUrl = await text({
        message: t(locale, "databaseUrl"),
        placeholder: t(locale, "databaseUrlHint"),
        initialValue: defaultDatabaseUrl(database),
        defaultValue: defaultDatabaseUrl(database),
        validate: (value) => {
          const trimmed = value.trim();
          if (!trimmed) return undefined;
          return providerMatchesUrl(database, trimmed)
            ? undefined
            : t(locale, "invalidUrl", { url: trimmed, provider: database });
        },
      });
      databaseUrl = databaseUrl.trim();
      if (!databaseUrl) databaseUrl = defaultDatabaseUrl(database);
    }
  } else {
    databaseUrl = databaseUrl.trim();
    if (databaseUrl && !providerMatchesUrl(database, databaseUrl)) {
      throw new Error(
        t(locale, "invalidUrl", { url: databaseUrl, provider: database }),
      );
    }
  }

  let directUrl = flags.directUrl;
  if (
    directUrl === undefined &&
    interactive &&
    database !== "sqlite" &&
    databaseUrl &&
    looksPooled(databaseUrl)
  ) {
    directUrl = await text({
      message: t(locale, "directUrl"),
      placeholder: t(locale, "directUrlHint"),
    });
    directUrl = directUrl.trim() || undefined;
  }

  const packageManager =
    flags.packageManager ?? detectPackageManager();
  if (!PACKAGE_MANAGERS.includes(packageManager)) {
    throw new Error(t(locale, "pmInvalid"));
  }

  const install =
    flags.install ?? (await confirm(t(locale, "install"), true));
  const git = flags.git ?? (await confirm(t(locale, "git"), true));

  const migrate =
    flags.migrate ??
    (databaseUrl
      ? await confirm(t(locale, "migrate"), true)
      : false);

  const seed =
    flags.seed ??
    (template === "blog" || template === "demo" || template === "saas"
      ? await confirm(t(locale, "seed"), true)
      : false);

  const panelPath = normalizePanelPath(
    flags.panelPath ??
      (interactive
        ? await text({
            message: t(locale, "panelPath"),
            initialValue: "/admin",
            defaultValue: "/admin",
          })
        : "/admin"),
  );

  return {
    name,
    dir,
    template,
    auth,
    database,
    databaseUrl,
    directUrl,
    packageManager,
    install,
    git,
    migrate,
    seed,
    panelPath,
    locale,
    yes: flags.yes,
    dryRun: false,
    tenancy,
  };
}
