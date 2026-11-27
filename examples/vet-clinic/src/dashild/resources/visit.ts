import { defineResource } from "@dashild/core";

export const visitResource = defineResource({
  model: "Visit",
  navigation: { label: "Visits", slug: "visits", group: "Medical", icon: "file-text" },
  table: {
    searchable: ["reason", "diagnosis"],
    pageSize: 25,
    columns: [
      { field: "visitedAt", format: "datetime", sortable: true },
      { field: "pet", display: "name", sortable: true },
      { field: "vet", display: "name" },
      { field: "reason" },
      { field: "diagnosis" },
    ],
    filters: [{ field: "pet", type: "relation", label: "Pet", display: "name" }],
  },
  form: {
    fields: [
      { field: "visitedAt", type: "datetime", rules: { required: true } },
      {
        field: "pet",
        type: "relation",
        relation: "pet",
        display: "name",
        rules: { required: true },
      },
      {
        field: "vet",
        type: "relation",
        relation: "vet",
        display: "name",
      },
      { field: "reason", type: "text", rules: { required: true } },
      { field: "diagnosis", type: "textarea" },
      { field: "notes", type: "textarea" },
    ],
  },
  policy: { scope: "organization" },
});
