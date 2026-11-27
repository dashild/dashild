import { defineResource } from "@dashild/core";

export const ownerResource = defineResource({
  model: "Owner",
  navigation: { label: "Owners", slug: "owners", group: "Clinic", icon: "users" },
  table: {
    searchable: ["name", "email", "phone"],
    pageSize: 25,
    columns: [
      { field: "name", sortable: true },
      { field: "email", sortable: true },
      { field: "phone" },
      { field: "createdAt", format: "datetime", sortable: true },
    ],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      { field: "email", type: "email" },
      { field: "phone", type: "text" },
    ],
  },
  policy: { scope: "organization" },
});
