/**
 * `dashild init`: add the panel to an existing Next.js app.
 *
 * It writes only app glue: the panel config, a fail-closed policy file, the
 * action registry, the app's runtime wiring and the mount route. It never
 * touches middleware/proxy, the root layout, next.config or the auth files.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

import type { Locale } from "@dashild/core";

import { cliMessage } from "./messages.js";
import { findMetadata, readMetadata } from "./metadata.js";

export type AuthProvider = "none" | "better-auth";

export interface InitOptions {
  cwd: string;
  metadata?: string;
  path?: string;
  auth?: string;
  locale?: Locale;
  force?: boolean;
}

export interface InitFile {
  path: string;
  content: string;
}

export interface InitAppend {
  path: string;
  content: string;
}

export interface InitPlan {
  cwd: string;
  appDir: string;
  panelPath: string;
  files: InitFile[];
  appends: InitAppend[];
  authProvider: AuthProvider;
  packageJsonPath: string;
  packageJson: string;
  scriptAdded: boolean;
  warnings: string[];
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function importPath(from: string, to: string): string {
  const path = relative(dirname(from), to)
    .replace(/\\/g, "/")
    .replace(/\.(tsx?|jsx?)$/, "");
  return path.startsWith(".") ? path : `./${path}`;
}

function normalizeRoute(value: string): string {
  const cleaned = value.replace(/^\/+|\/+$/g, "");
  return `/${cleaned}`;
}

function routeDirectory(value: string): string {
  return value.replace(/^\/+/, "");
}

function appDirectory(cwd: string): string {
  const src = resolve(cwd, "src/app");
  if (existsSync(src)) return src;
  const app = resolve(cwd, "app");
  if (existsSync(app)) return app;
  return src;
}

function chooseRoute(
  cwd: string,
  appDir: string,
  requested: string | undefined,
  locale: Locale,
  warnings: string[],
): string {
  if (requested) {
    const route = normalizeRoute(requested);
    const page = resolve(appDir, routeDirectory(route), "page.tsx");
    if (existsSync(page)) {
      throw new Error(
        cliMessage(locale, "init.exists", {
          path: relative(cwd, page),
        }),
      );
    }
    return route;
  }

  const candidates = ["admin", "panel", "admin-panel", "dashild"];
  for (const candidate of candidates) {
    const page = resolve(appDir, candidate, "page.tsx");
    if (!existsSync(page)) {
      if (candidate !== "admin") {
        warnings.push(
          cliMessage(locale, "init.routeConflict", {
            path: relative(cwd, resolve(appDir, "admin", "page.tsx")),
            route: candidate,
          }),
        );
      }
      return `/${candidate}`;
    }
  }

  throw new Error(
    cliMessage(locale, "init.exists", {
      path: relative(cwd, resolve(appDir, "admin/page.tsx")),
    }),
  );
}

function prismaModule(cwd: string): { path: string; found: boolean } {
  const candidates = [
    "src/lib/prisma.ts",
    "src/lib/prisma.tsx",
    "lib/prisma.ts",
    "lib/prisma.tsx",
    "src/lib/db.ts",
    "src/db.ts",
    "lib/db.ts",
    "src/prisma.ts",
    "prisma.ts",
  ];

  for (const candidate of candidates) {
    const full = resolve(cwd, candidate);
    if (existsSync(full)) return { path: full, found: true };
  }

  return { path: resolve(cwd, "src/lib/prisma.ts"), found: false };
}

const BETTER_AUTH_VERSION = "^1.7.27";
const AUTH_MODEL_NAMES = ["User", "Session", "Account", "Verification"];

function libDirectory(cwd: string, appDir: string): string {
  const src = resolve(cwd, "src/lib");
  if (existsSync(src)) return src;
  const root = resolve(cwd, "lib");
  if (existsSync(root)) return root;
  return resolve(dirname(appDir), "lib");
}

function componentsDirectory(cwd: string, appDir: string): string {
  const src = resolve(cwd, "src/components");
  if (existsSync(src)) return src;
  const root = resolve(cwd, "components");
  if (existsSync(root)) return root;
  return resolve(dirname(appDir), "components");
}

function prismaProvider(schema: string): string {
  const match = schema.match(
    /datasource\s+\w+\s*\{[\s\S]*?provider\s*=\s*"([^"]+)"/,
  );
  const provider = match?.[1] ?? "postgresql";
  return ["postgresql", "mysql", "sqlite"].includes(provider)
    ? provider
    : "postgresql";
}

function authModelNames(schema: string): string[] {
  return AUTH_MODEL_NAMES.filter((name) =>
    new RegExp(`\\bmodel\\s+${name}\\b`).test(schema),
  );
}

function betterAuthModels(): string {
  return `
// Better Auth models. Added by \`dashild init --auth better-auth\`.
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts      Account[]
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
}
`;
}

function betterAuthFile(
  authPath: string,
  prismaPath: string,
  provider: string,
): string {
  return `import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from ${quote(importPath(authPath, prismaPath))};

/**
 * Better Auth with the app's Prisma client.
 *
 * The auth models are in prisma/schema.prisma. Keep BETTER_AUTH_SECRET out of
 * version control; see .env.example.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: ${quote(provider)},
  }),
  appName: "Dashild",
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : [],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },
});
`;
}

function authClientFile(): string {
  return `"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
`;
}

function sessionFile(sessionPath: string, authPath: string): string {
  return `import { headers } from "next/headers";

import { auth } from ${quote(importPath(sessionPath, authPath))};

/** The signed-in app user, or null. */
export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}
`;
}

function authActionsFile(authActionsPath: string, authPath: string): string {
  return `"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from ${quote(importPath(authActionsPath, authPath))};

export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
`;
}

function apiAuthRouteFile(routePath: string, authPath: string): string {
  return `import { toNextJsHandler } from "better-auth/next-js";

import { auth } from ${quote(importPath(routePath, authPath))};

export const { GET, POST } = toNextJsHandler(auth);
`;
}

function loginFormFile(
  formPath: string,
  authClientPath: string,
  panelPath: string,
): string {
  return `"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@dashild/admin/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@dashild/admin/ui/field";
import { Input } from "@dashild/admin/ui/input";
import { Spinner } from "@dashild/admin/ui/spinner";

import { authClient } from ${quote(importPath(formPath, authClientPath))};

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });

    if (result.error) {
      setError(result.error.message ?? "Could not sign in.");
      setPending(false);
      return;
    }

    const target =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : ${quote(panelPath)};
    router.push(target);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Field>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <FieldDescription className="text-center">
            No account? <Link href="/signup">Create one</Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
`;
}

function signupFormFile(
  formPath: string,
  authClientPath: string,
  panelPath: string,
): string {
  return `"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@dashild/admin/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@dashild/admin/ui/field";
import { Input } from "@dashild/admin/ui/input";
import { Spinner } from "@dashild/admin/ui/spinner";

import { authClient } from ${quote(importPath(formPath, authClientPath))};

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const result = await authClient.signUp.email({ name, email, password });

    if (result.error) {
      setError(result.error.message ?? "Could not create the account.");
      setPending(false);
      return;
    }

    router.push(${quote(panelPath)});
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" type="text" autoComplete="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <FieldDescription>At least 8 characters.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Field>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Creating account…" : "Create account"}
          </Button>
          <FieldDescription className="text-center">
            Already have an account? <Link href="/login">Sign in</Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
`;
}

function authPageFile(
  pagePath: string,
  formPath: string,
  mode: "login" | "signup",
): string {
  const formImport = quote(importPath(pagePath, formPath));

  if (mode === "login") {
    return `import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashild/admin/ui/card";

import { LoginForm } from ${formImport};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use your email and password to open the panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} />
        </CardContent>
      </Card>
    </main>
  );
}
`;
  }

  return `import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashild/admin/ui/card";

import { SignupForm } from ${formImport};

export default function SignupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Create your account. An administrator can grant access later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
    </main>
  );
}
`;
}

function panelFile(
  panelPath: string,
  authProvider: AuthProvider,
  sessionPath?: string,
  signOutPath?: string,
  panelFilePath?: string,
): string {
  if (authProvider === "better-auth" && sessionPath && signOutPath && panelFilePath) {
    return `import { definePanel } from "@dashild/core";

import { signOut } from ${quote(importPath(panelFilePath, signOutPath))};
import { getCurrentUser } from ${quote(importPath(panelFilePath, sessionPath))};

/**
 * Panel configuration.
 *
 * Better Auth is wired in lib/auth.ts. The other packages never import it:
 * the panel only needs getCurrentUser and signOut.
 */
export const panel = definePanel({
  title: "Admin",
  path: ${quote(panelPath)},
  locale: "en",
  resources: [],
  auth: {
    getCurrentUser,
    signOut,
  },
});
`;
  }

  return `import { definePanel, type CurrentUser } from "@dashild/core";

/**
 * Panel configuration.
 *
 * Dashild never touches your auth files. Complete this adapter: return the
 * signed-in user or null. Organization fields are optional; add them when the
 * app has organizations.
 */
async function getCurrentUser(): Promise<CurrentUser | null> {
  // TODO: replace with your authentication adapter.
  return null;
}

export const panel = definePanel({
  title: "Admin",
  path: ${quote(panelPath)},
  locale: "en",
  resources: [],
  auth: {
    getCurrentUser,
  },
});
`;
}

function policiesFile(): string {
  return `import { definePolicies, type CurrentUser } from "@dashild/core";

/**
 * Server policies.
 *
 * Fail closed: a resource without an entry here is denied, even if it exists
 * in Prisma. Add one entry per resource, with its scope and permissions.
 */
export const policies = definePolicies<CurrentUser>({
  resources: {},
});
`;
}

function actionsFile(): string {
  return `import type { ActionHandler, CurrentUser } from "@dashild/core";

/**
 * Custom action handlers, keyed by Prisma model and action name.
 *
 * The action itself is declared in the resource (table.actions/form.actions);
 * the handler lives here because it runs on the server. Use the \`db\` passed in
 * the context instead of importing Prisma directly: it already carries the
 * active policy scope.
 */
export const resourceActions: Record<
  string,
  Record<string, ActionHandler<CurrentUser>>
> = {};
`;
}

function iconsFile(): string {
  return `"use client";

import type { ElementType } from "react";

import { IconProvider } from "@dashild/admin";

/**
 * App icon registry.
 *
 * Add any React icon component here under the name used by
 * \`navigation.icon\` or \`action.icon\`.
 */
export const icons: Record<string, ElementType> = {};

export function AppIconProvider({ children }: { children: React.ReactNode }) {
  return <IconProvider icons={icons}>{children}</IconProvider>;
}
`;
}

function runtimeFile(
  metadataPath: string,
  prismaPath: string,
  runtimePath: string,
): string {
  return `import type { DashildMetadata } from "@dashild/core";
import { createDashildRuntime } from "@dashild/core/server";

import metadataJson from ${quote(importPath(runtimePath, metadataPath))};
import { prisma } from ${quote(importPath(runtimePath, prismaPath))};

import { resourceActions } from "./actions";
import { panel } from "./panel";
import { policies } from "./policies";

const metadata = metadataJson as unknown as DashildMetadata;

/**
 * App runtime.
 *
 * The generic query and write logic lives in @dashild/core/server. This file
 * only wires the app's Prisma client, metadata, policies and action handlers.
 */
export const runtime = createDashildRuntime({
  prisma,
  metadata,
  resources: panel.resources,
  policies,
  locale: panel.locale,
  actions: resourceActions,
});
`;
}

function serverFile(): string {
  return `"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { translate } from "@dashild/core";
import type {
  RuntimeActionInput,
  RuntimeActionResult,
  RuntimeSaveResult,
} from "@dashild/core/server";

import { panel } from "./panel";
import { runtime } from "./runtime";

/**
 * Server actions for the panel.
 *
 * The client sends a slug, an id and values; it never sends a where, a policy
 * or an organization scope. The runtime resolves and enforces all of them.
 */

export async function saveResource(input: {
  slug: string;
  id?: string;
  values: Record<string, unknown>;
}): Promise<RuntimeSaveResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  const result = await runtime.save(input, user);
  if (!result.ok) return result;

  revalidatePath(\`\${panel.path}/\${input.slug}\`);
  redirect(\`\${panel.path}/\${input.slug}\`);
}

export async function deleteResource(input: {
  slug: string;
  id: string;
}): Promise<RuntimeSaveResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  const result = await runtime.remove(input, user);
  if (!result.ok) return result;

  revalidatePath(\`\${panel.path}/\${input.slug}\`);
  redirect(\`\${panel.path}/\${input.slug}\`);
}

export async function runResourceAction(
  input: RuntimeActionInput,
): Promise<RuntimeActionResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  return runtime.runAction(input, user);
}
`;
}

function routeFile(
  routePath: string,
  panelModule: string,
  policiesModule: string,
  runtimeModule: string,
  serverModule: string,
  iconsModule: string,
): string {
  return `import { AdminPage } from "@dashild/admin/server";

import { AppIconProvider } from ${quote(importPath(routePath, iconsModule))};
import { panel } from ${quote(importPath(routePath, panelModule))};
import { policies } from ${quote(importPath(routePath, policiesModule))};
import { runtime } from ${quote(importPath(routePath, runtimeModule))};
import {
  deleteResource,
  runResourceAction,
  saveResource,
} from ${quote(importPath(routePath, serverModule))};

/**
 * Dashild mount route.
 *
 * Routing, policy and data loading live in @dashild/admin/server. This file
 * only wires the app's session and server actions.
 */

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DashildPage({
  params,
  searchParams,
}: {
  params: Promise<{ dashild?: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <AdminPage
      panel={panel}
      policies={policies}
      runtime={runtime}
      saveAction={saveResource}
      deleteAction={deleteResource}
      runAction={runResourceAction}
      IconProvider={AppIconProvider}
      params={params}
      searchParams={searchParams}
      theme={panel.theme?.defaultMode ?? "light"}
      themeToggle={panel.theme?.toggle ?? false}
    />
  );
}
`;
}

export function planInit(options: InitOptions): InitPlan {
  const cwd = resolve(options.cwd);
  const locale = options.locale ?? "en";
  const requestedAuth = options.auth ?? "none";

  if (requestedAuth !== "none" && requestedAuth !== "better-auth") {
    throw new Error(
      cliMessage(locale, "init.auth.invalid", {
        provider: requestedAuth,
      }),
    );
  }

  const authProvider = requestedAuth as AuthProvider;
  const packageJsonPath = resolve(cwd, "package.json");

  if (!existsSync(packageJsonPath)) {
    throw new Error(
      cliMessage(locale, "init.notNext", { path: relative(process.cwd(), cwd) }),
    );
  }

  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  if (
    !packageJson.dependencies?.next &&
    !packageJson.devDependencies?.next
  ) {
    throw new Error(
      cliMessage(locale, "init.notNext", { path: relative(process.cwd(), cwd) }),
    );
  }

  const metadataPath = findMetadata(cwd, options.metadata, locale);
  const metadata = readMetadata(metadataPath, locale);

  const warnings: string[] = [];
  const appDir = appDirectory(cwd);
  const panelPath = chooseRoute(cwd, appDir, options.path, locale, warnings);

  const dashildDir = resolve(cwd, "src/dashild");
  const panelFilePath = resolve(dashildDir, "panel.ts");
  const runtimePath = resolve(dashildDir, "runtime.ts");
  const prisma = prismaModule(cwd);
  if (!prisma.found) {
    warnings.push(
      cliMessage(locale, "init.warning.prisma", {
        path: relative(cwd, prisma.path),
      }),
    );
  }

  const schemaCandidates = [
    metadata.schemaPath,
    resolve(cwd, "prisma/schema.prisma"),
    resolve(cwd, "schema.prisma"),
  ].filter((path): path is string => Boolean(path));
  const schemaPath = schemaCandidates.find((path) => existsSync(path));
  const schemaSource = schemaPath ? readFileSync(schemaPath, "utf8") : "";
  const provider = schemaSource ? prismaProvider(schemaSource) : "postgresql";

  const routePath = resolve(
    appDir,
    routeDirectory(panelPath),
    "[[...dashild]]/page.tsx",
  );

  const files: InitFile[] = [
    {
      path: panelFilePath,
      content: panelFile(panelPath, "none"),
    },
    {
      path: resolve(dashildDir, "policies.ts"),
      content: policiesFile(),
    },
    {
      path: resolve(dashildDir, "actions/index.ts"),
      content: actionsFile(),
    },
    {
      path: resolve(dashildDir, "icons.tsx"),
      content: iconsFile(),
    },
    {
      path: runtimePath,
      content: runtimeFile(metadataPath, prisma.path, runtimePath),
    },
    {
      path: resolve(dashildDir, "server.ts"),
      content: serverFile(),
    },
    {
      path: routePath,
      content: routeFile(
        routePath,
        panelFilePath,
        resolve(dashildDir, "policies.ts"),
        runtimePath,
        resolve(dashildDir, "server.ts"),
        resolve(dashildDir, "icons.tsx"),
      ),
    },
  ];

  const appends: InitAppend[] = [];

  if (authProvider === "better-auth") {
    const libDir = libDirectory(cwd, appDir);
    const componentsDir = componentsDirectory(cwd, appDir);
    const authPath = resolve(libDir, "auth.ts");
    const authClientPath = resolve(libDir, "auth-client.ts");
    const sessionPath = resolve(libDir, "session.ts");
    const authActionsPath = resolve(libDir, "auth-actions.ts");
    const apiRoutePath = resolve(appDir, "api/auth/[...all]/route.ts");
    const loginFormPath = resolve(
      componentsDir,
      "dashild/login-form.tsx",
    );
    const signupFormPath = resolve(
      componentsDir,
      "dashild/signup-form.tsx",
    );
    const loginPagePath = resolve(appDir, "login/page.tsx");
    const signupPagePath = resolve(appDir, "signup/page.tsx");

    files[0] = {
      path: panelFilePath,
      content: panelFile(
        panelPath,
        "better-auth",
        sessionPath,
        authActionsPath,
        panelFilePath,
      ),
    };

    files.push(
      {
        path: authPath,
        content: betterAuthFile(authPath, prisma.path, provider),
      },
      { path: authClientPath, content: authClientFile() },
      { path: sessionPath, content: sessionFile(sessionPath, authPath) },
      {
        path: authActionsPath,
        content: authActionsFile(authActionsPath, authPath),
      },
      {
        path: apiRoutePath,
        content: apiAuthRouteFile(apiRoutePath, authPath),
      },
      {
        path: loginFormPath,
        content: loginFormFile(loginFormPath, authClientPath, panelPath),
      },
      {
        path: signupFormPath,
        content: signupFormFile(signupFormPath, authClientPath, panelPath),
      },
      {
        path: loginPagePath,
        content: authPageFile(loginPagePath, loginFormPath, "login"),
      },
      {
        path: signupPagePath,
        content: authPageFile(signupPagePath, signupFormPath, "signup"),
      },
    );

    if (schemaPath) {
      const existingModels = authModelNames(schemaSource);
      if (existingModels.length > 0) {
        warnings.push(
          cliMessage(locale, "init.auth.models", {
            models: existingModels.join(", "),
            path: relative(cwd, schemaPath),
          }),
        );
      } else {
        appends.push({
          path: schemaPath,
          content: betterAuthModels(),
        });
      }
    } else {
      warnings.push(cliMessage(locale, "init.auth.schemaMissing"));
    }

    const envPath = resolve(cwd, ".env.example");
    const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
    const envKeys = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"].filter(
      (key) => !new RegExp(`^${key}=`, "m").test(env),
    );

    if (envKeys.length > 0) {
      const lines = [
        "BETTER_AUTH_SECRET=\"\"",
        "BETTER_AUTH_URL=\"http://localhost:3000\"",
      ].filter((line) =>
        envKeys.some((key) => line.startsWith(`${key}=`)),
      );
      const separator = env === "" || env.endsWith("\n") ? "" : "\n";
      appends.push({
        path: envPath,
        content: `${separator}\n# Better Auth\n${lines.join("\n")}\n`,
      });
    }

    const secret = env.match(/^BETTER_AUTH_SECRET=(.*)$/m);
    if (
      secret?.[1] !== undefined &&
      !secret[1].replace(/["']/g, "").trim()
    ) {
      warnings.push(cliMessage(locale, "init.auth.secret"));
    }

    const installedAuth =
      packageJson.dependencies?.["better-auth"] ??
      packageJson.devDependencies?.["better-auth"];
    if (!installedAuth) {
      packageJson.dependencies = {
        ...packageJson.dependencies,
        "better-auth": BETTER_AUTH_VERSION,
      };
    }
  }

  if (!options.force) {
    const existing = files.find((file) => existsSync(file.path));
    if (existing) {
      throw new Error(
        cliMessage(locale, "init.exists", {
          path: relative(cwd, existing.path),
        }),
      );
    }
  }

  const installed = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const missing = ["@dashild/admin", "@dashild/core", "@dashild/prisma"].filter(
    (name) => !installed[name],
  );
  if (missing.length > 0) {
    warnings.push(
      cliMessage(locale, "init.warning.deps", {
        packages: missing.join(", "),
      }),
    );
  }

  const scriptAdded = !packageJson.scripts?.dashild;
  if (scriptAdded) {
    packageJson.scripts = {
      ...packageJson.scripts,
      dashild: "dashild",
    };
  }

  return {
    cwd,
    appDir,
    panelPath,
    authProvider,
    files,
    appends,
    packageJsonPath,
    packageJson: `${JSON.stringify(packageJson, null, 2)}\n`,
    scriptAdded,
    warnings,
  };
}

export function applyInit(plan: InitPlan): void {
  for (const file of plan.files) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.content, "utf8");
  }

  for (const append of plan.appends) {
    mkdirSync(dirname(append.path), { recursive: true });
    const existing = existsSync(append.path)
      ? readFileSync(append.path, "utf8")
      : "";
    writeFileSync(append.path, existing + append.content, "utf8");
  }

  writeFileSync(plan.packageJsonPath, plan.packageJson, "utf8");
}

export function formatInitPlan(plan: InitPlan, locale: Locale = "en"): string {
  const lines = ["dashild init", ""];
  lines.push(`Panel: ${plan.panelPath}`);
  lines.push(`Auth: ${plan.authProvider}`);

  for (const warning of plan.warnings) {
    lines.push(`⚠ ${warning}`);
  }

  lines.push("", cliMessage(locale, "init.plan"));

  for (const file of plan.files) {
    lines.push(`  create ${relative(plan.cwd, file.path)}`);
  }

  for (const append of plan.appends) {
    lines.push(`  append ${relative(plan.cwd, append.path)}`);
  }

  if (plan.scriptAdded) {
    lines.push(`  update ${relative(plan.cwd, plan.packageJsonPath)}`);
  }

  return lines.join("\n");
}
