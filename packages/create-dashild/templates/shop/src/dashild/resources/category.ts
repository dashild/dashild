import { defineResource } from "@dashild/core";

export const categoryResource = defineResource({
  model: "Category",
  navigation: { label: "Categories", slug: "categories", group: "Catalog", icon: "tag" },
  table: {
    searchable: ["name"],
    columns: [
      { field: "name", sortable: true },
      { field: "slug", sortable: true },
    ],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      { field: "slug", type: "text", rules: { required: true } },
    ],
  },
  policy: { scope: "public" },
});
