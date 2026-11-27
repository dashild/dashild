import type { LoadedTemplate } from "../types.js";

const manifest = {
  name: "saas",
  version: "0.1.0",
  description: "Organizations, members and projects, isolated by tenant",
  dashild: ">=0.1.0-alpha.10",
  prisma: { provider: ["postgresql", "mysql", "sqlite"] as const },
  requires: { auth: ["better-auth"] as const, tenancy: true },
  extend: {
    Organization: ["projects Project[]"],
  },
};

const files = new Map<string, string>([
  [
    "prisma/models.prisma",
    `enum ProjectStatus {
  ACTIVE
  PAUSED
  ARCHIVED
}

model Project {
  id             String        @id @default(uuid())
  name           String
  status         ProjectStatus @default(ACTIVE)
  organizationId String
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([organizationId])
}
`,
  ],
  [
    "src/dashild/resources/project.ts",
    `import { defineResource } from "@dashild/core";

export const projectResource = defineResource({
  model: "Project",

  navigation: {
    label: "Projects",
    slug: "projects",
    group: "Workspace",
  },

  table: {
    searchable: ["name"],
    pageSize: 25,
    columns: [
      { field: "name", label: "Name", sortable: true },
      {
        field: "status",
        label: "Status",
        format: "badge",
        tone: { ACTIVE: "accent", PAUSED: "muted", ARCHIVED: "danger" },
      },
      { field: "organization", label: "Organization", display: "name", sortable: true },
      {
        field: "createdAt",
        label: "Created",
        format: "datetime",
        sortable: true,
      },
    ],
    filters: [
      { field: "status", type: "enum", label: "Status" },
      {
        field: "organization",
        type: "relation",
        label: "Organization",
        display: "name",
      },
    ],
  },

  form: {
    fields: [
      {
        field: "name",
        type: "text",
        label: "Name",
        rules: { required: true },
      },
      { field: "status", type: "select", label: "Status" },
      {
        field: "organization",
        type: "relation",
        label: "Organization",
        relation: "organization",
        display: "name",
        rules: { required: true },
      },
    ],
  },

  policy: { scope: "organization" },
});
`,
  ],
  [
    "src/dashild/resources/user.ts",
    `import { defineResource } from "@dashild/core";

export const userResource = defineResource({
  model: "User",

  navigation: {
    label: "Members",
    slug: "members",
    group: "Workspace",
  },

  table: {
    searchable: ["name", "email"],
    pageSize: 25,
    columns: [
      { field: "name", label: "Name", sortable: true },
      { field: "email", label: "Email", sortable: true },
      {
        field: "role",
        label: "Role",
        format: "badge",
        tone: { ADMIN: "accent", USER: "muted" },
      },
      {
        field: "organization",
        label: "Organization",
        display: "name",
        sortable: true,
      },
    ],
    filters: [
      { field: "role", type: "enum", label: "Role" },
      {
        field: "organization",
        type: "relation",
        label: "Organization",
        display: "name",
      },
    ],
  },

  form: {
    fields: [
      {
        field: "name",
        type: "text",
        label: "Name",
        rules: { required: true },
      },
      { field: "role", type: "select", label: "Role" },
      {
        field: "organization",
        type: "relation",
        label: "Organization",
        relation: "organization",
        display: "name",
        rules: { required: true },
      },
    ],
  },

  policy: { scope: "organization" },
});
`,
  ],
  [
    "src/dashild/resources/organization.ts",
    `import { defineResource } from "@dashild/core";

export const organizationResource = defineResource({
  model: "Organization",

  navigation: {
    label: "Organizations",
    slug: "organizations",
    group: "Workspace",
    icon: "organization",
  },

  table: {
    searchable: ["name"],
    columns: [{ field: "name", label: "Name", sortable: true }],
  },

  form: {
    fields: [
      {
        field: "name",
        type: "text",
        label: "Name",
        rules: { required: true },
      },
    ],
  },

  policy: { scope: "organization" },
});
`,
  ],
  [
    "src/dashild/policies.ts",
    `import {
  definePolicies,
  hasRole,
  type CurrentUser,
} from "@dashild/core";

/**
 * Tenant isolation.
 *
 * A scope that returns null denies the resource, so a session without an
 * organization sees nothing. Members only read their own organization's rows;
 * admins manage organizations and membership.
 */
export const policies = definePolicies<CurrentUser>({
  resources: {
    User: {
      scope: (ctx) =>
        ctx.organizationId ? { organizationId: ctx.organizationId } : null,
      can: {
        create: () => false,
        update: (ctx) => hasRole(ctx, "ADMIN"),
        delete: () => false,
      },
    },
    Organization: {
      scope: (ctx) => (ctx.organizationId ? { id: ctx.organizationId } : null),
      can: {
        create: () => false,
        update: (ctx) => hasRole(ctx, "ADMIN"),
        delete: () => false,
      },
    },
    Project: {
      scope: (ctx) =>
        ctx.organizationId ? { organizationId: ctx.organizationId } : null,
      can: {
        create: (ctx) => hasRole(ctx, "ADMIN", "USER"),
        update: (ctx) => hasRole(ctx, "ADMIN", "USER"),
        delete: (ctx) => hasRole(ctx, "ADMIN"),
      },
    },
  },
});
`,
  ],
  [
    "prisma/seed.ts",
    `import "dotenv/config";

import { auth } from "__DASHILD_LIB__/auth";
import { prisma } from "__DASHILD_LIB__/prisma";

const PASSWORD = "dashild123";

async function reset() {
  await prisma.project.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

async function main() {
  await reset();

  const acme = await prisma.organization.create({ data: { name: "Acme" } });
  const beta = await prisma.organization.create({ data: { name: "Beta" } });

  const people = [
    {
      email: "ana@acme.test",
      name: "Ana Torres",
      role: "ADMIN" as const,
      organizationId: acme.id,
    },
    {
      email: "bruno@acme.test",
      name: "Bruno Díaz",
      role: "USER" as const,
      organizationId: acme.id,
    },
    {
      email: "carla@beta.test",
      name: "Carla Ruiz",
      role: "USER" as const,
      organizationId: beta.id,
    },
  ];

  for (const person of people) {
    const created = await auth.api.signUpEmail({
      body: { email: person.email, password: PASSWORD, name: person.name },
    });
    if (!created.user) {
      throw new Error("Better Auth did not create " + person.email);
    }

    await prisma.user.update({
      where: { id: created.user.id },
      data: { role: person.role, organizationId: person.organizationId },
    });
  }

  await prisma.project.createMany({
    data: [
      { name: "Website", status: "ACTIVE", organizationId: acme.id },
      { name: "Internal tools", status: "PAUSED", organizationId: acme.id },
      { name: "Launch", status: "ACTIVE", organizationId: beta.id },
    ],
  });

  const [organizations, users, projects] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.project.count(),
  ]);

  console.log(
    "seed:",
    organizations,
    "organizations,",
    users,
    "users,",
    projects,
    "projects",
  );
  console.log(
    "login: ana@acme.test (ADMIN) or bruno@acme.test (USER) / " + PASSWORD,
  );
  console.log("login: carla@beta.test (other tenant) / " + PASSWORD);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
`,
  ],
]);

export const saasTemplate: LoadedTemplate = {
  manifest: {
    ...manifest,
    prisma: { provider: [...manifest.prisma.provider] },
    requires: {
      auth: [...manifest.requires.auth],
      tenancy: manifest.requires.tenancy,
    },
    extend: { ...manifest.extend },
  },
  files,
  source: "bundled",
};
