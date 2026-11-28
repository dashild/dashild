import { defineResource } from "@dashild/core";

export const postResource = defineResource({
  model: "Post",

  navigation: {
    label: "Posts",
    slug: "posts",
    group: "Content",
    icon: "file-text",
  },

  table: {
    searchable: ["title", "excerpt"],
    pageSize: 25,
    columns: [
      { field: "title", label: "Title", sortable: true },
      {
        field: "status",
        label: "Status",
        format: "badge",
        tone: { DRAFT: "muted", REVIEW: "accent", PUBLISHED: "green" },
      },
      { field: "category", label: "Category", display: "name", sortable: true },
      { field: "author", label: "Author", display: "name", sortable: true },
      {
        field: "publishedAt",
        label: "Published",
        format: "datetime",
        sortable: true,
      },
    ],
    filters: [
      { field: "status", type: "enum", label: "Status" },
      { field: "category", type: "relation", label: "Category", display: "name" },
      { field: "author", type: "relation", label: "Author", display: "name" },
    ],
    actions: [
      { name: "create", placement: "header" },
      { name: "view", placement: "row" },
      { name: "edit", placement: "row" },
      { name: "delete", placement: "row" },
      {
        name: "publish",
        label: "Publish",
        placement: "row",
        requires: "publish",
        variant: "secondary",
      },
      {
        name: "unpublish",
        label: "Unpublish",
        placement: "row",
        requires: "unpublish",
        confirm: true,
      },
    ],
  },

  form: {
    fields: [
      { field: "title", type: "text", rules: { required: true } },
      { field: "slug", type: "text", rules: { required: true } },
      { field: "excerpt", type: "textarea" },
      { field: "body", type: "textarea", rules: { required: true } },
      { field: "status", type: "select" },
      { field: "publishedAt", type: "datetime" },
      {
        field: "author",
        type: "relation",
        relation: "author",
        display: "name",
        rules: { required: true },
      },
      {
        field: "category",
        type: "relation",
        relation: "category",
        display: "name",
      },
      {
        field: "tags",
        type: "relation",
        relation: "tags",
        display: "name",
        multiple: true,
      },
      { field: "cover", type: "bytes" },
    ],
  },

  policy: { scope: "author" },
});
