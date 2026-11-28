import { defineResource } from "@dashild/core";

export const tagResource = defineResource({
  model: "Tag",
  navigation: {
    label: "Tags",
    slug: "tags",
    group: "Content",
    icon: "tag",
  },
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
