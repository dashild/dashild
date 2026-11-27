import { defineResource } from "@dashild/core";

export const vaccinationResource = defineResource({
  model: "Vaccination",
  navigation: {
    label: "Vaccinations",
    slug: "vaccinations",
    group: "Medical",
    icon: "shield",
  },
  table: {
    searchable: ["name"],
    pageSize: 25,
    columns: [
      { field: "name", sortable: true },
      { field: "pet", display: "name", sortable: true },
      { field: "appliedAt", format: "date", sortable: true },
      { field: "nextDueAt", format: "date", sortable: true },
    ],
    filters: [{ field: "pet", type: "relation", label: "Pet", display: "name" }],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      {
        field: "pet",
        type: "relation",
        relation: "pet",
        display: "name",
        rules: { required: true },
      },
      { field: "appliedAt", type: "date" },
      { field: "nextDueAt", type: "date" },
    ],
  },
  policy: { scope: "organization" },
});
