import { defineResource } from "@dashild/core";

export const appointmentResource = defineResource({
  model: "Appointment",
  navigation: {
    label: "Appointments",
    slug: "appointments",
    group: "Clinic",
    icon: "calendar",
  },
  table: {
    searchable: ["reason"],
    pageSize: 25,
    columns: [
      { field: "startsAt", format: "datetime", sortable: true },
      { field: "pet", display: "name", sortable: true },
      { field: "vet", display: "name" },
      { field: "reason" },
      {
        field: "status",
        format: "badge",
        tone: { SCHEDULED: "accent", ATTENDED: "green", CANCELLED: "danger" },
      },
    ],
    filters: [
      { field: "status", type: "enum", label: "Status" },
      { field: "pet", type: "relation", label: "Pet", display: "name" },
      { field: "vet", type: "relation", label: "Vet", display: "name" },
    ],
    actions: [
      { name: "create", placement: "header" },
      { name: "view", placement: "row" },
      { name: "edit", placement: "row" },
      { name: "delete", placement: "row" },
      {
        name: "attend",
        label: "Mark attended",
        placement: "row",
        requires: "attend",
        variant: "secondary",
      },
      {
        name: "cancel",
        label: "Cancel",
        placement: "row",
        requires: "cancel",
        variant: "destructive",
        confirm: true,
      },
    ],
  },
  form: {
    fields: [
      { field: "startsAt", type: "datetime", rules: { required: true } },
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
      { field: "status", type: "select" },
    ],
  },
  policy: { scope: "organization" },
});
