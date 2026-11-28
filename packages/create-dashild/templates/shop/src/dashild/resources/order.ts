import { defineResource } from "@dashild/core";

export const orderResource = defineResource({
  model: "Order",
  navigation: { label: "Orders", slug: "orders", group: "Sales", icon: "shopping-cart" },
  table: {
    searchable: ["number"],
    pageSize: 25,
    columns: [
      { field: "number", sortable: true },
      { field: "customer", display: "name", sortable: true },
      {
        field: "status",
        format: "badge",
        tone: { PENDING: "accent", PAID: "green", SHIPPED: "muted", CANCELLED: "danger" },
      },
      { field: "total", format: "currency", currency: "EUR", sortable: true },
      { field: "createdAt", format: "datetime", sortable: true },
    ],
    filters: [
      { field: "status", type: "enum", label: "Status" },
      { field: "customer", type: "relation", label: "Customer", display: "name" },
    ],
    actions: [
      { name: "create", placement: "header" },
      { name: "view", placement: "row" },
      { name: "edit", placement: "row" },
      { name: "delete", placement: "row" },
      {
        name: "markPaid",
        label: "Mark paid",
        placement: "row",
        requires: "markPaid",
        variant: "secondary",
      },
      {
        name: "ship",
        label: "Ship",
        placement: "row",
        requires: "ship",
        variant: "secondary",
      },
      {
        name: "cancelOrder",
        label: "Cancel",
        placement: "row",
        requires: "cancelOrder",
        confirm: true,
      },
    ],
  },
  form: {
    fields: [
      { field: "number", type: "text", rules: { required: true } },
      {
        field: "customer",
        type: "relation",
        relation: "customer",
        display: "name",
        rules: { required: true },
      },
      { field: "status", type: "select" },
      { field: "total", type: "number", default: 0 },
    ],
  },
  policy: { scope: "public" },
});
