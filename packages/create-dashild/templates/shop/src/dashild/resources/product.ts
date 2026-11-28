import { defineResource } from "@dashild/core";

export const productResource = defineResource({
  model: "Product",
  navigation: { label: "Products", slug: "products", group: "Catalog", icon: "package" },
  table: {
    searchable: ["name", "sku"],
    pageSize: 25,
    columns: [
      { field: "name", sortable: true },
      { field: "sku", sortable: true },
      { field: "price", format: "currency", currency: "EUR", sortable: true },
      { field: "stock", format: "number", sortable: true },
      { field: "category", display: "name", sortable: true },
      { field: "supplier", display: "name" },
    ],
    filters: [
      { field: "category", type: "relation", label: "Category", display: "name" },
      { field: "supplier", type: "relation", label: "Supplier", display: "name" },
    ],
    actions: [
      { name: "create", placement: "header" },
      { name: "view", placement: "row" },
      { name: "edit", placement: "row" },
      { name: "delete", placement: "row" },
      {
        name: "restock",
        label: "Restock +10",
        placement: "row",
        requires: "restock",
        variant: "secondary",
        data: { amount: 10 },
      },
    ],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      { field: "sku", type: "text", rules: { required: true } },
      { field: "description", type: "textarea" },
      { field: "price", type: "number", rules: { required: true } },
      { field: "stock", type: "number", default: 0 },
      {
        field: "category",
        type: "relation",
        relation: "category",
        display: "name",
      },
      {
        field: "supplier",
        type: "relation",
        relation: "supplier",
        display: "name",
      },
    ],
  },
  policy: { scope: "public" },
});
