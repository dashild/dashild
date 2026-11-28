import { defineResource } from "@dashild/core";

export const customerResource = defineResource({
  model: "Customer",
  navigation: { label: "Customers", slug: "customers", group: "Sales", icon: "users" },
  table: {
    searchable: ["name", "email", "phone"],
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
  policy: { scope: "public" },
});
