import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { applyInit, formatInitPlan, planInit } from "../src/init.js";

function project(options: { next?: boolean } = {}): string {
  const directory = mkdtempSync(join(tmpdir(), "dashild-init-"));
  mkdirSync(join(directory, "src/app"), { recursive: true });
  mkdirSync(join(directory, "src/lib"), { recursive: true });
  mkdirSync(join(directory, "src/generated/dashild"), { recursive: true });
  mkdirSync(join(directory, "prisma"), { recursive: true });

  const dependencies =
    options.next === false
      ? {}
      : {
          next: "16.4.6",
          "@dashild/admin": "0.0.0",
          "@dashild/core": "0.0.0",
          "@dashild/prisma": "0.0.0",
        };
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify(
      {
        name: "init-test",
        private: true,
        dependencies,
        scripts: { dev: "next dev" },
      },
      null,
      2,
    ),
    "utf8",
  );

  writeFileSync(
    join(directory, "src/lib/prisma.ts"),
    "export const prisma = {};\n",
    "utf8",
  );
  writeFileSync(
    join(directory, "src/generated/dashild/dashild-metadata.json"),
    JSON.stringify({ formatVersion: 1, models: [], enums: [] }),
    "utf8",
  );
  writeFileSync(
    join(directory, "prisma/schema.prisma"),
    'datasource db {\n  provider = "postgresql"\n}\n\nmodel Customer {\n  id String @id\n}\n',
    "utf8",
  );
  writeFileSync(
    join(directory, ".env.example"),
    'DATABASE_URL="postgresql://localhost/app"\n',
    "utf8",
  );

  return directory;
}

test("init: plans the panel, runtime, icons and route", () => {
  const directory = project();

  try {
    const plan = planInit({ cwd: directory });

    assert.equal(plan.panelPath, "/admin");
    assert.equal(plan.scriptAdded, true);
    assert.equal(plan.warnings.length, 0);
    assert.equal(plan.files.length, 8);

    const paths = plan.files.map((file) => file.path);
    assert.ok(paths.some((path) => path.endsWith("src/dashild/panel.ts")));
    assert.ok(paths.some((path) => path.endsWith("src/dashild/runtime.ts")));
    assert.ok(paths.some((path) => path.endsWith("src/dashild/server.ts")));
    assert.ok(paths.some((path) => path.endsWith("src/dashild/registry.tsx")));
    assert.ok(
      paths.some((path) =>
        path.endsWith("src/app/admin/[[...dashild]]/page.tsx"),
      ),
    );

    const route = plan.files.find((file) =>
      file.path.endsWith("page.tsx"),
    );
    assert.ok(route);
    assert.match(route.content, /@dashild\/admin\/server/);
    assert.match(route.content, /AdminPage/);
    assert.match(route.content, /from "..\/..\/..\/dashild\/panel"/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: applies the files and adds the script", () => {
  const directory = project();

  try {
    const plan = planInit({ cwd: directory });
    applyInit(plan);

    assert.ok(existsSync(join(directory, "src/dashild/panel.ts")));
    assert.ok(existsSync(join(directory, "src/dashild/server.ts")));
    assert.ok(
      existsSync(
        join(directory, "src/app/admin/[[...dashild]]/page.tsx"),
      ),
    );

    const packageJson = JSON.parse(
      readFileSync(join(directory, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    assert.equal(packageJson.scripts.dashild, "dashild");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: refuses to overwrite without --force", () => {
  const directory = project();

  try {
    applyInit(planInit({ cwd: directory }));
    assert.throws(
      () => planInit({ cwd: directory }),
      /already exists/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: chooses another route when /admin already exists", () => {
  const directory = project();

  try {
    mkdirSync(join(directory, "src/app/admin"), { recursive: true });
    writeFileSync(
      join(directory, "src/app/admin/page.tsx"),
      "export default function Page() { return null; }\n",
      "utf8",
    );

    const plan = planInit({ cwd: directory });

    assert.equal(plan.panelPath, "/panel");
    assert.ok(plan.warnings.some((warning) => warning.includes("/panel")));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: a missing Prisma module is a warning", () => {
  const directory = project();

  try {
    rmSync(join(directory, "src/lib/prisma.ts"));
    const plan = planInit({ cwd: directory });

    assert.ok(
      plan.warnings.some((warning) => warning.includes("Prisma")),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: requires Next.js", () => {
  const directory = project({ next: false });

  try {
    assert.throws(() => planInit({ cwd: directory }), /Next\.js/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: the plan is printable", () => {
  const directory = project();

  try {
    const text = formatInitPlan(planInit({ cwd: directory }));
    assert.match(text, /Panel: \/admin/);
    assert.match(text, /src\/dashild\/panel\.ts/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: better-auth plans the auth files, schema and env", () => {
  const directory = project();

  try {
    const plan = planInit({ cwd: directory, auth: "better-auth" });

    assert.equal(plan.authProvider, "better-auth");
    const paths = plan.files.map((file) => file.path);
    assert.ok(paths.some((path) => path.endsWith("src/lib/auth.ts")));
    assert.ok(paths.some((path) => path.endsWith("src/lib/auth-client.ts")));
    assert.ok(paths.some((path) => path.endsWith("src/lib/session.ts")));
    assert.ok(
      paths.some((path) => path.endsWith("src/lib/auth-actions.ts")),
    );
    assert.ok(
      paths.some((path) =>
        path.endsWith("src/app/api/auth/[...all]/route.ts"),
      ),
    );
    assert.ok(paths.some((path) => path.endsWith("src/app/login/page.tsx")));
    assert.ok(paths.some((path) => path.endsWith("src/app/signup/page.tsx")));
    assert.ok(paths.some((path) => path.endsWith("src/lib/email.ts")));
    assert.ok(
      paths.some((path) => path.endsWith("src/app/forgot-password/page.tsx")),
    );
    assert.ok(
      paths.some((path) => path.endsWith("src/app/reset-password/page.tsx")),
    );
    assert.ok(
      paths.some((path) =>
        path.endsWith("src/components/dashild/forgot-password-form.tsx"),
      ),
    );
    assert.ok(
      paths.some((path) =>
        path.endsWith("src/components/dashild/reset-password-form.tsx"),
      ),
    );

    assert.ok(
      paths.some((path) =>
        path.endsWith("src/components/dashild/login-form.tsx"),
      ),
    );
    assert.ok(
      paths.some((path) =>
        path.endsWith("src/components/dashild/signup-form.tsx"),
      ),
    );

    const auth = plan.files.find((file) =>
      file.path.endsWith("src/lib/auth.ts"),
    );
    assert.ok(auth);
    assert.match(auth.content, /disableSignUp/);
    assert.match(auth.content, /rateLimit/);
    assert.match(auth.content, /sendResetPassword/);
    assert.match(auth.content, /sendVerificationEmail/);

    const panel = plan.files.find((file) =>
      file.path.endsWith("src/dashild/panel.ts"),
    );
    assert.ok(panel);
    assert.match(panel.content, /getCurrentUser/);
    assert.match(panel.content, /signOut/);

    assert.ok(
      plan.appends.some(
        (append) =>
          append.path.endsWith("prisma/schema.prisma") &&
          append.content.includes("model User") &&
          append.content.includes("model Session"),
      ),
    );
    assert.ok(
      plan.appends.some(
        (append) =>
          append.path.endsWith(".env.example") &&
          append.content.includes("BETTER_AUTH_SECRET") &&
          append.content.includes("BETTER_AUTH_URL") &&
          append.content.includes("ALLOW_SIGNUP") &&
          append.content.includes("REQUIRE_EMAIL_VERIFICATION"),
      ),
    );

    const packageJson = JSON.parse(plan.packageJson) as {
      dependencies: Record<string, string>;
    };
    assert.equal(packageJson.dependencies["better-auth"], "^1.7.27");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: better-auth applies files and appends without losing content", () => {
  const directory = project();

  try {
    applyInit(planInit({ cwd: directory, auth: "better-auth" }));

    const schema = readFileSync(
      join(directory, "prisma/schema.prisma"),
      "utf8",
    );
    assert.match(schema, /model Customer/);
    assert.match(schema, /model User/);
    assert.match(schema, /model Account/);

    const env = readFileSync(join(directory, ".env.example"), "utf8");
    assert.match(env, /DATABASE_URL/);
    assert.match(env, /BETTER_AUTH_SECRET/);
    assert.match(env, /BETTER_AUTH_URL/);
    assert.match(env, /ALLOW_SIGNUP/);
    assert.match(env, /REQUIRE_EMAIL_VERIFICATION/);
    assert.match(env, /RESEND_API_KEY/);

    assert.ok(
      existsSync(join(directory, "src/app/api/auth/[...all]/route.ts")),
    );
    assert.ok(existsSync(join(directory, "src/app/login/page.tsx")));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: existing auth models are a warning, not a duplicate", () => {
  const directory = project();

  try {
    writeFileSync(
      join(directory, "prisma/schema.prisma"),
      'datasource db {\n  provider = "postgresql"\n}\n\nmodel User {\n  id String @id\n}\n',
      "utf8",
    );

    const plan = planInit({ cwd: directory, auth: "better-auth" });
    assert.ok(
      plan.warnings.some((warning) => warning.includes("existing auth models")),
    );
    assert.ok(
      !plan.appends.some((append) =>
        append.path.endsWith("prisma/schema.prisma"),
      ),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: rejects an unknown auth provider", () => {
  const directory = project();

  try {
    assert.throws(
      () => planInit({ cwd: directory, auth: "nextauth" }),
      /Unknown auth provider/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: tenancy adds organizations, tenant session and switcher", () => {
  const directory = project();

  try {
    const plan = planInit({
      cwd: directory,
      auth: "better-auth",
      tenancy: true,
    });

    const paths = plan.files.map((file) => file.path);
    assert.ok(paths.some((path) => path.endsWith("src/lib/organization.ts")));
    assert.ok(
      paths.some((path) =>
        path.endsWith("src/dashild/organization-actions.ts"),
      ),
    );

    const route = plan.files.find((file) =>
      file.path.endsWith("page.tsx"),
    )?.content;
    assert.match(route ?? "", /getOrganizationContext/);
    assert.match(route ?? "", /switchOrganization/);
    assert.match(route ?? "", /organizations=\{organization\?\.organizations\}/);

    const session = plan.files.find((file) =>
      file.path.endsWith("session.ts"),
    )?.content;
    assert.match(session ?? "", /ORGANIZATION_COOKIE/);
    assert.match(session ?? "", /organizationId/);

    const schema = plan.appends.find((append) =>
      append.path.endsWith("schema.prisma"),
    )?.content;
    assert.match(schema ?? "", /model Organization/);
    assert.match(schema ?? "", /organizationId String\?/);
    assert.match(schema ?? "", /role\s+Role/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: tenancy requires Better Auth", () => {
  const directory = project();

  try {
    assert.throws(
      () => planInit({ cwd: directory, auth: "none", tenancy: true }),
      /better-auth|Better Auth/i,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: tenancy refuses a schema with existing auth models", () => {
  const directory = project();

  try {
    writeFileSync(
      join(directory, "prisma/schema.prisma"),
      'datasource db {\n  provider = "postgresql"\n}\n\nmodel User {\n  id String @id\n}\n',
      "utf8",
    );

    assert.throws(
      () =>
        planInit({ cwd: directory, auth: "better-auth", tenancy: true }),
      /Tenancy|tenencia|auth models/i,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("init: generated glue carries a version marker", () => {
  const directory = project();

  try {
    const plan = planInit({ cwd: directory, auth: "better-auth" });
    const panel = plan.files.find((file) =>
      file.path.endsWith("src/dashild/panel.ts"),
    )?.content;
    assert.match(panel ?? "", /^\/\/ dashild:generated \d+\.\d+\.\d+/);

    const session = plan.files.find((file) =>
      file.path.endsWith("src/lib/session.ts"),
    )?.content;
    assert.match(session ?? "", /\/\/ dashild:generated/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
