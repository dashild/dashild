import assert from "node:assert/strict";
import { test } from "node:test";

import {
  defaultFormActions,
  defaultTableActions,
  findAction,
  mergeActionDefaults,
  resolveFormActions,
  resolveTableActions,
  type ResourceDefinition,
} from "../src/index.js";

const resource = (overrides: Partial<ResourceDefinition> = {}): ResourceDefinition => ({
  model: "User",
  navigation: { label: "Users", slug: "users" },
  table: { columns: [] },
  form: { fields: [] },
  ...overrides,
});

test("sin acciones declaradas: CRUD integrado", () => {
  assert.deepEqual(
    defaultTableActions().map((action) => action.name),
    ["create", "view", "edit", "delete"],
  );
  assert.deepEqual(
    defaultFormActions().map((action) => action.name),
    ["save", "cancel"],
  );
});

test("acciones declaradas: la lista es la completa", () => {
  const custom = resource({
    table: {
      columns: [],
      actions: [
        { name: "create", placement: "header" },
        { name: "view" },
        { name: "edit" },
      ],
    },
  });

  const actions = resolveTableActions(custom);
  assert.deepEqual(
    actions.map((action) => action.name),
    ["create", "view", "edit"],
  );
  assert.equal(actions.some((action) => action.name === "delete"), false);
});

test("las integradas recuperan etiqueta, variante y confirmación", () => {
  const deleteAction = mergeActionDefaults({ name: "delete" }, "es");
  assert.equal(deleteAction.label, "Eliminar");
  assert.equal(deleteAction.variant, "destructive");
  assert.equal(deleteAction.confirm, "Esta acción no se puede deshacer.");

  const custom = mergeActionDefaults({ name: "export", label: "Exportar" });
  assert.deepEqual(custom, { name: "export", label: "Exportar" });

  const englishDelete = mergeActionDefaults({ name: "delete" });
  assert.equal(englishDelete.label, "Delete");
});

test("formulario: acciones por defecto o declaradas", () => {
  assert.deepEqual(
    resolveFormActions(resource()).map((action) => action.name),
    ["save", "cancel"],
  );

  const custom = resource({
    form: {
      fields: [],
      actions: [{ name: "save" }, { name: "export", label: "Exportar" }],
    },
  });

  assert.deepEqual(
    resolveFormActions(custom).map((action) => action.name),
    ["save", "export"],
  );
});

test("findAction busca en tabla y formulario", () => {
  const custom = resource({
    table: { columns: [], actions: [{ name: "export" }] },
    form: { fields: [], actions: [{ name: "save" }, { name: "send" }] },
  });

  assert.equal(findAction(custom, "export")?.name, "export");
  assert.equal(findAction(custom, "send")?.name, "send");
  assert.equal(findAction(custom, "missing"), undefined);
});
