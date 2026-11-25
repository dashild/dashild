import { defineResource } from "@dashild/core";

/**
 * Recurso Organization.
 *
 * Generado por `dashild make:resource` a partir de dashild-metadata.json.
 * Este archivo es tuyo: edítalo libremente. Dashild no lo vuelve a escribir.
 */
export const organizationResource = defineResource({
  model: "Organization",

  navigation: {
    label: "Organizations",
    slug: "organizations",
    icon: "building",
    group: "Administración",
  },

  policy: { scope: "organization" },

  table: {
    searchable: ["name"],
    pageSize: 25,
    columns: [
      { field: "name", label: "Name", sortable: true },
    ],
  },

  form: {
    fields: [
      { field: "name", type: "text", label: "Name", rules: { required: true } },
    ],
  },
});
