import { defineResource } from "@dashild/core";

export const customerResource = defineResource({
  model: "Customer",
  navigation: { label: "Customers", slug: "customers", group: "Sales", icon: "users" },
  table: {
    searchable: ["name", "email", "phone"],
    columns: [
      { field: "name", sortable: true },
      { field: "email", sortable: true },
      { field: "phone" },
      { field: "createdAt", format: "datetime", sortable: true },
    ],
    actions: [
      { name: "create", placement: "header" },
      { name: "view", placement: "row" },
      { name: "edit", placement: "row" },
      { name: "delete", placement: "row" },
      {
        name: "openInStripe",
        label: "Open in Stripe",
        placement: "row",
        variant: "outline",
      },
    ],
  },
  form: {
    fields: [
      { field: "name", type: "text", rules: { required: true } },
      { field: "email", type: "email" },
      { field: "phone", type: "text" },
      { field: "stripeCustomerId", type: "text" },
    ],
  },
  policy: { scope: "public" },
});
