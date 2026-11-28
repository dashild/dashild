import { defineResource } from "@dashild/core";

export const orderItemResource = defineResource({
  model: "OrderItem",
  navigation: {
    label: "Order items",
    slug: "order-items",
    group: "Sales",
    icon: "layers",
  },
  table: {
    columns: [
      { field: "order", display: "number", sortable: true },
      { field: "product", display: "name", sortable: true },
      { field: "quantity", format: "number", sortable: true },
      { field: "unitPrice", format: "currency", currency: "EUR" },
    ],
    filters: [
      { field: "order", type: "relation", label: "Order", display: "number" },
      { field: "product", type: "relation", label: "Product", display: "name" },
    ],
  },
  form: {
    fields: [
      {
        field: "order",
        type: "relation",
        relation: "order",
        display: "number",
        rules: { required: true },
      },
      {
        field: "product",
        type: "relation",
        relation: "product",
        display: "name",
        rules: { required: true },
      },
      { field: "quantity", type: "number", default: 1 },
      { field: "unitPrice", type: "number", rules: { required: true } },
    ],
  },
  policy: { scope: "public" },
});
