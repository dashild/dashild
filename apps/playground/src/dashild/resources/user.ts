import { defineResource } from "@dashild/core";

/**
 * Recurso User: un archivo, solo datos.
 *
 * Este archivo es el contrato de la tabla y del formulario. No contiene
 * consultas, ni funciones, ni código de servidor. `make:resource` deberá
 * escribir exactamente esto cuando exista.
 */
export const userResource = defineResource({
  model: "User",

  navigation: {
    label: "Usuarios",
    slug: "users",
    icon: "users",
    group: "Administración",
  },

  policy: { scope: "organization" },

  table: {
    searchable: ["name", "email"],
    pageSize: 2,
    columns: [
      { field: "name", label: "Nombre", sortable: true, cell: "avatar" },
      { field: "email", label: "Email", sortable: true },
      {
        field: "role",
        label: "Rol",
        format: "badge",
        tone: { ADMIN: "accent", USER: "muted" },
      },
      {
        field: "organization",
        label: "Organización",
        display: "name",
        sortable: true,
      },
      { field: "balance", label: "Saldo", format: "number" },
      { field: "bigNumber", label: "Número grande" },
      { field: "metadata", label: "Ajustes", format: "json" },
      {
        field: "isActive",
        label: "Activo",
        format: "badge",
        tone: { true: "green", false: "muted" },
      },
      {
        field: "createdAt",
        label: "Creado",
        format: "datetime",
        sortable: true,
      },
    ],
    filters: [
      {
        field: "organization",
        type: "relation",
        label: "Organización",
        display: "name",
      },
      { field: "role", type: "enum", label: "Rol" },
      { field: "isActive", type: "boolean", label: "Activo" },
    ],
  },

  form: {
    fields: [
      {
        field: "name",
        type: "text",
        label: "Nombre",
        rules: { required: true },
      },
      {
        field: "email",
        type: "email",
        label: "Email",
        component: "email",
        rules: { required: true },
      },
      { field: "role", type: "select", label: "Rol", default: "USER" },
      { field: "avatar", type: "bytes", label: "Avatar" },
      {
        field: "organization",
        type: "relation",
        label: "Organización",
        relation: "organization",
        display: "name",
        rules: { required: true },
      },
      { field: "balance", type: "number", label: "Saldo" },
      { field: "isActive", type: "boolean", label: "Activo", default: true },
    ],
  },
});
