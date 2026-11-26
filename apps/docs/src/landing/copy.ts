export type Locale = "en" | "es";

export type IconName =
  | "file"
  | "shield"
  | "layers"
  | "code"
  | "database"
  | "terminal";

export interface LandingFeature {
  icon: IconName;
  title: string;
  body: string;
}

export interface LandingStep {
  title: string;
  body: string;
  command: string;
}

export interface LandingCopy {
  lang: Locale;
  meta: { title: string; description: string };
  nav: {
    docs: string;
    guides: string;
    github: string;
    cta: string;
    otherLabel: string;
    otherAria: string;
  };
  hero: {
    badge: string;
    before: string;
    accent: string;
    lead: string;
    primary: string;
    secondary: string;
    note: string;
    stack: string[];
  };
  terminal: { title: string; command: string; lines: string[] };
  code: {
    eyebrow: string;
    title: string;
    body: string;
    checklist: string[];
    filename: string;
    note: string;
  };
  features: {
    eyebrow: string;
    title: string;
    lead: string;
    items: LandingFeature[];
  };
  steps: {
    eyebrow: string;
    title: string;
    lead: string;
    items: LandingStep[];
  };
  contrast: {
    title: string;
    lead: string;
    oldLabel: string;
    oldItems: string[];
    newLabel: string;
    newItems: string[];
  };
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
    command: string;
  };
  footer: {
    tagline: string;
    docs: string;
    guides: string;
    github: string;
    license: string;
    note: string;
  };
  copyLabel: string;
  copiedLabel: string;
}

const en: LandingCopy = {
  lang: "en",
  meta: {
    title: "Dashild — The application admin layer for Next.js",
    description:
      "One resource file, server-enforced security, and a shadcn UI you own. The admin layer for Next.js and Prisma.",
  },
  nav: {
    docs: "Docs",
    guides: "Guides",
    github: "GitHub",
    cta: "Get started",
    otherLabel: "ES",
    otherAria: "Ver en español",
  },
  hero: {
    badge: "Alpha · Next.js + Prisma",
    before: "Build products,",
    accent: "not dashboards.",
    lead: "Dashild is the application admin layer for Next.js. One resource file, server-enforced security, and a UI you own.",
    primary: "Start building",
    secondary: "Star on GitHub",
    note: "MIT licensed · alpha software · no generated pages",
    stack: ["Next.js", "Prisma", "Better Auth", "Tailwind v4", "shadcn/ui"],
  },
  terminal: {
    title: "~/my-app",
    command: "pnpm create dashild@latest my-app",
    lines: [
      "Scaffolding Next.js + Dashild",
      "Panel ready at /admin",
      "Database migrated and seeded",
    ],
  },
  code: {
    eyebrow: "The resource",
    title: "The whole admin, in one file.",
    body: "Describe the table, form, filters, and actions. Dashild derives the table, detail, and route; the server enforces the scope.",
    checklist: [
      "No codegen to run",
      "No page per resource",
      "No `where` in the resource",
    ],
    filename: "customer.ts",
    note: "One file. Zero generated pages.",
  },
  features: {
    eyebrow: "Why Dashild",
    title: "Everything the admin needs. Nothing you have to generate.",
    lead: "A complete panel without a page generator, a schema DSL, or a second app.",
    items: [
      {
        icon: "file",
        title: "One file per resource",
        body: "Table, form, filters, actions, and policy in a single serializable file.",
      },
      {
        icon: "shield",
        title: "Security on the server",
        body: "Scope, per-action permissions, and roles are enforced where the data lives.",
      },
      {
        icon: "layers",
        title: "Relations that work",
        body: "o2m and m2m managers with create, edit, delete, attach, and detach.",
      },
      {
        icon: "code",
        title: "Your components",
        body: "Register cells and fields, copy templates with ui:add, and keep the UI yours.",
      },
      {
        icon: "database",
        title: "Auth and data you control",
        body: "Better Auth is scaffolded; PostgreSQL, MySQL, and SQLite are supported.",
      },
      {
        icon: "terminal",
        title: "Ship anywhere",
        body: "Deploy the Next.js app, not a separate panel. The CLI covers the lifecycle.",
      },
    ],
  },
  steps: {
    eyebrow: "Quick start",
    title: "From zero to a working panel in minutes.",
    lead: "Three commands and a resource file. No generators to babysit.",
    items: [
      {
        title: "Scaffold",
        body: "Create a Next.js app with the panel, auth, and database wired.",
        command: "pnpm create dashild@latest my-app",
      },
      {
        title: "Describe a resource",
        body: "Generate one file from your Prisma schema and make it yours.",
        command: "pnpm dashild make:resource Customer",
      },
      {
        title: "Ship",
        body: "Run the app. Tables, forms, and policies are live.",
        command: "pnpm dev",
      },
    ],
  },
  contrast: {
    title: "No codegen to babysit.",
    lead: "The resource is data, not a template you re-run and reconcile.",
    oldLabel: "Generated CRUD",
    oldItems: [
      "A page per model",
      "Re-run after every schema change",
      "Permissions patched per page",
      "UI you cannot easily replace",
    ],
    newLabel: "Dashild",
    newItems: [
      "One route for every resource",
      "The resource is write-once data",
      "Policy enforced in one place",
      "shadcn UI you own",
    ],
  },
  cta: {
    title: "Ship the admin, not the boilerplate.",
    body: "Create the app, describe a resource, and keep building the product.",
    primary: "Read the docs",
    secondary: "GitHub",
    command: "pnpm create dashild@latest my-app",
  },
  footer: {
    tagline: "The application admin layer for Next.js.",
    docs: "Documentation",
    guides: "Guides",
    github: "GitHub",
    license: "MIT licensed",
    note: "Alpha software. APIs may change.",
  },
  copyLabel: "Copy",
  copiedLabel: "Copied",
};

const es: LandingCopy = {
  lang: "es",
  meta: {
    title: "Dashild — La capa de administración para Next.js",
    description:
      "Un archivo de recurso, seguridad en servidor y una UI de shadcn que es tuya. La capa de administración para Next.js y Prisma.",
  },
  nav: {
    docs: "Docs",
    guides: "Guías",
    github: "GitHub",
    cta: "Empezar",
    otherLabel: "EN",
    otherAria: "View in English",
  },
  hero: {
    badge: "Alpha · Next.js + Prisma",
    before: "Construye producto,",
    accent: "no dashboards.",
    lead: "Dashild es la capa de administración para Next.js. Un archivo de recurso, seguridad en servidor y una UI que es tuya.",
    primary: "Empezar",
    secondary: "Ver en GitHub",
    note: "MIT · software alpha · sin páginas generadas",
    stack: ["Next.js", "Prisma", "Better Auth", "Tailwind v4", "shadcn/ui"],
  },
  terminal: {
    title: "~/mi-app",
    command: "pnpm create dashild@latest mi-app",
    lines: [
      "Creando Next.js + Dashild",
      "Panel listo en /admin",
      "Base migrada y sembrada",
    ],
  },
  code: {
    eyebrow: "El recurso",
    title: "Todo el panel, en un archivo.",
    body: "Describe la tabla, el formulario, los filtros y las acciones. Dashild deriva la tabla, el detalle y la ruta; el servidor aplica el ámbito.",
    checklist: [
      "Sin codegen",
      "Sin una página por recurso",
      "Sin el `where` en el recurso",
    ],
    filename: "customer.ts",
    note: "Un archivo. Cero páginas generadas.",
  },
  features: {
    eyebrow: "Por qué Dashild",
    title: "Todo lo que el panel necesita. Nada que generar.",
    lead: "Un panel completo sin generador de páginas, sin DSL de schema y sin una segunda app.",
    items: [
      {
        icon: "file",
        title: "Un archivo por recurso",
        body: "Tabla, formulario, filtros, acciones y política en un único archivo serializable.",
      },
      {
        icon: "shield",
        title: "Seguridad en servidor",
        body: "Ámbito, permisos por acción y roles se aplican donde viven los datos.",
      },
      {
        icon: "layers",
        title: "Relaciones que funcionan",
        body: "Gestores o2m y m2m con crear, editar, eliminar, attach y detach.",
      },
      {
        icon: "code",
        title: "Tus componentes",
        body: "Registra celdas y campos, copia plantillas con ui:add y conserva tu UI.",
      },
      {
        icon: "database",
        title: "Auth y datos bajo tu control",
        body: "Better Auth viene scaffolded; PostgreSQL, MySQL y SQLite están soportados.",
      },
      {
        icon: "terminal",
        title: "Despliega donde quieras",
        body: "Publica la app de Next.js, no un panel aparte. La CLI cubre el ciclo completo.",
      },
    ],
  },
  steps: {
    eyebrow: "Inicio rápido",
    title: "De cero a un panel funcionando en minutos.",
    lead: "Tres comandos y un archivo de recurso. Sin generadores que mantener.",
    items: [
      {
        title: "Crea la app",
        body: "Next.js con el panel, auth y base de datos conectados.",
        command: "pnpm create dashild@latest mi-app",
      },
      {
        title: "Describe un recurso",
        body: "Genera un archivo desde tu schema de Prisma y hazlo tuyo.",
        command: "pnpm dashild make:resource Customer",
      },
      {
        title: "Publica",
        body: "Arranca la app. Tablas, formularios y políticas están listos.",
        command: "pnpm dev",
      },
    ],
  },
  contrast: {
    title: "Sin codegen que mantener.",
    lead: "El recurso es dato, no una plantilla que re-ejecutas y reconcilias.",
    oldLabel: "CRUD generado",
    oldItems: [
      "Una página por modelo",
      "Re-ejecutar en cada cambio de schema",
      "Permisos parcheados por página",
      "UI difícil de reemplazar",
    ],
    newLabel: "Dashild",
    newItems: [
      "Una ruta para todos los recursos",
      "El recurso es dato write-once",
      "La política se aplica en un sitio",
      "UI de shadcn que es tuya",
    ],
  },
  cta: {
    title: "Envía el admin, no el boilerplate.",
    body: "Crea la app, describe un recurso y sigue construyendo producto.",
    primary: "Leer la documentación",
    secondary: "GitHub",
    command: "pnpm create dashild@latest mi-app",
  },
  footer: {
    tagline: "La capa de administración para Next.js.",
    docs: "Documentación",
    guides: "Guías",
    github: "GitHub",
    license: "MIT",
    note: "Software alpha. La API puede cambiar.",
  },
  copyLabel: "Copiar",
  copiedLabel: "Copiado",
};

export const copy: Record<Locale, LandingCopy> = { en, es };
