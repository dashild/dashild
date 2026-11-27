import { defineResource } from "@dashild/core";

export const petResource = defineResource({
  model: "Pet",
  navigation: { label: "Pets", slug: "pets", group: "Clinic", icon: "layers" },
  table: {
    searchable: ["name", "breed"],
    pageSize: 25,
    columns: [
      { field: "name", sortable: true },
      { field: "species", cell: "species" },
      { field: "breed" },
      { field: "owner", display: "name", sortable: true },
      { field: "birthDate", format: "date", sortable: true },
    ],
    filters: [
      { field: "species", type: "enum", label: "Species" },
      { field: "owner", type: "relation", label: "Owner", display: "name" },
    ],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      { field: "species", type: "select" },
      { field: "breed", type: "text" },
      { field: "birthDate", type: "date" },
      {
        field: "owner",
        type: "relation",
        relation: "owner",
        display: "name",
        rules: { required: true },
      },
      { field: "photo", type: "bytes" },
    ],
  },
  policy: { scope: "organization" },
});
