import { defineResource } from "@dashild/core";

export const staffResource = defineResource({
  model: "User",
  navigation: {
    label: "Staff",
    slug: "staff",
    group: "Settings",
    icon: "users",
  },
  table: {
    searchable: ["name", "email"],
    columns: [
      { field: "name", sortable: true },
      { field: "email", sortable: true },
      {
        field: "role",
        format: "badge",
        tone: { ADMIN: "accent", AUTHOR: "muted" },
      },
    ],
    filters: [{ field: "role", type: "enum", label: "Role" }],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      { field: "role", type: "select" },
    ],
  },
  policy: { scope: "public" },
});
