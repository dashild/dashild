import { defineResource } from "@dashild/core";

export const commentResource = defineResource({
  model: "Comment",
  navigation: {
    label: "Comments",
    slug: "comments",
    group: "Moderation",
    icon: "mail",
  },
  table: {
    searchable: ["authorName", "body"],
    columns: [
      { field: "authorName", label: "Author", sortable: true },
      { field: "post", label: "Post", display: "title", sortable: true },
      {
        field: "approved",
        label: "Approved",
        format: "badge",
        tone: { true: "green", false: "muted" },
      },
      { field: "createdAt", format: "datetime", sortable: true },
    ],
    filters: [
      { field: "approved", type: "boolean", label: "Approved" },
      { field: "post", type: "relation", label: "Post", display: "title" },
    ],
    actions: [
      { name: "create", placement: "header" },
      { name: "view", placement: "row" },
      { name: "edit", placement: "row" },
      { name: "delete", placement: "row" },
      {
        name: "approve",
        label: "Approve",
        placement: "row",
        requires: "approve",
        variant: "secondary",
      },
      {
        name: "unapprove",
        label: "Unapprove",
        placement: "row",
        requires: "unapprove",
        confirm: true,
      },
    ],
  },
  form: {
    fields: [
      { field: "authorName", type: "text", rules: { required: true } },
      { field: "body", type: "textarea", rules: { required: true } },
      {
        field: "post",
        type: "relation",
        relation: "post",
        display: "title",
        rules: { required: true },
      },
      { field: "approved", type: "boolean" },
    ],
  },
  policy: { scope: "post" },
});
