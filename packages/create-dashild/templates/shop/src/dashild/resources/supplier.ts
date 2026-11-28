import { defineResource } from "@dashild/core";

export const supplierResource = defineResource({
  model: "Supplier",
  navigation: { label: "Suppliers", slug: "suppliers", group: "Catalog", icon: "truck" },
  table: {
    searchable: ["name", "email"],
    columns: [
      { field: "name", sortable: true },
      { field: "email", sortable: true },
    ],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      { field: "email", type: "email" },
    ],
  },
  policy: { scope: "public" },
});
