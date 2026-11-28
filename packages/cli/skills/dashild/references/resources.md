# Resources

A resource describes one Prisma model: table, form, filters, navigation, and
actions. It is a serializable data file. Dashild renders it through one route;
there is no page to create.

## Anatomy

```ts
import { defineResource } from "@dashild/core";

export const customerResource = defineResource({
  model: "Customer",
  navigation: {
    label: "Customers",
    slug: "customers",
    group: "Sales",
    icon: "users",
  },
  table: {
    searchable: ["name", "email"],
    pageSize: 25,
    columns: [
      { field: "name", sortable: true },
      { field: "email", sortable: true },
      {
        field: "status",
        format: "badge",
        tone: { ACTIVE: "green", LEAD: "danger" },
      },
      { field: "organization", display: "name", sortable: true },
    ],
    filters: [
      { field: "status", type: "enum" },
      { field: "organization", type: "relation", display: "name" },
    ],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      { field: "email", type: "email", rules: { required: true } },
      { field: "status", type: "select" },
      {
        field: "organization",
        type: "relation",
        relation: "organization",
        display: "name",
      },
      { field: "notes", type: "textarea" },
      { field: "tags", type: "relation", relation: "tags", multiple: true, display: "name" },
      { field: "avatar", type: "bytes" },
    ],
  },
  policy: { scope: "organization" },
});
```

`policy` is a marker. The string is arbitrary (`"organization"`, `"public"`,
`"author"`...); it only signals that the resource is protected. The real rules
live in `policies.ts`.

## Generate

```bash
pnpm dashild make:resource Customer
```

- Writes `src/dashild/resources/customer.ts` from the Prisma metadata.
- Registers it in `src/dashild/panel.ts`.
- Adds a fail-closed entry (`scope: () => null`) to `policies.ts`.
- Write-once: it never overwrites an existing resource.
- Options: `--dir`, `--metadata`, `--cwd`, `--dry-run`, `--no-register`.

After editing the schema, run `pnpm prisma generate` before `make:resource`.
`migrate dev` writes the migration but does not regenerate Dashild metadata on
Prisma 7.10, so the new models would be missing.

## Field types

| Type | Control |
| --- | --- |
| `text` | Input |
| `textarea` | Multiline input |
| `email` | Email input |
| `password` | Password input |
| `number` | Number input |
| `boolean` | Switch |
| `date` / `datetime` | Date pickers |
| `select` | Select (use for Prisma enums) |
| `relation` | Select; `multiple: true` for m2m |
| `json` | Textarea with JSON validation |
| `list` | JSON array (scalar lists) |
| `bytes` | File picker; base64 on the wire |

`rules`: `required`, `min`, `max`, `pattern`. `default` sets an initial value.
`component` points to a field registered with `registerField`.

## Columns

`field`, `label`, `sortable`, `format`, `cell`, `display`, `tone`, `currency`.

- `format`: `text`, `badge`, `number`, `currency`, `date`, `datetime`, `json`.
- `tone`: `accent`, `green`, `muted`, `danger` (badges).
- `Decimal` values arrive as strings; `format: "currency"` converts them for
  display. Custom cells must parse them.
- `display`: the related field shown for a relation (`name`, `title`...).
- `cell`: a component registered with `registerCell`.

`searchable` only accepts String columns. Pagination, sorting, and filters run on
the server.

## Filters

`boolean`, `enum`, `relation`, `text`, `number`, `date`. They render as a bar
above the table and submit a GET form, so the values stay in the URL. Relation
filters support many-to-one only; enum options come from the Prisma enum and
relation options are loaded per user (and scoped).

## Relations

- m2o: a column with `display`; in forms, `type: "relation"`, `relation: "<name>"`,
  `display`.
- o2m: the child model needs its own resource; the parent detail page shows a
  relation manager. Detach appears only when the FK is optional.
- m2m: `type: "relation"`, `multiple: true`; attach/detach on the detail page.

## Custom cells and fields

```bash
pnpm dashild ui:add avatar-cell --dir src/components/dashild
```

It copies a template and prints the registration call; it does not edit the
registry. Register on the client:

```tsx
"use client";

import {
  registerCell,
  registeredCells,
  registeredFields,
} from "@dashild/core";
import { RegistryProvider, type Registry } from "@dashild/admin";

import { AvatarCell } from "../components/dashild/avatar-cell";

registerCell("avatar", AvatarCell);

export function AppRegistryProvider({ children }: { children: React.ReactNode }) {
  return (
    <RegistryProvider
      cells={registeredCells() as Registry["cells"]}
      fields={registeredFields() as Registry["fields"]}
    >
      {children}
    </RegistryProvider>
  );
}
```

The casts are required: core keeps the renderer types loose so it does not
depend on React.

## Icons

Built-in names: `users`, `user`, `building`, `organization`, `file-text`,
`settings`, `database`, `folder`, `chart`, `layout-dashboard`, `package`,
`shopping-cart`, `tag`, `calendar`, `mail`, `briefcase`, `credit-card`, `truck`,
`layers`. Add more in `src/dashild/icons.tsx` with an icon library.
