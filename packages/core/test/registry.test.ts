import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getRegisteredCell,
  getRegisteredField,
  registerCell,
  registerField,
  registeredCells,
  registeredFields,
} from "../src/index.js";

test("registry: cells and fields can be registered and read", () => {
  const cell = () => "cell";
  const field = () => "field";

  registerCell("avatar", cell);
  registerField("color", field);

  assert.equal(getRegisteredCell("avatar"), cell);
  assert.equal(getRegisteredField("color"), field);
  assert.equal(registeredCells().avatar, cell);
  assert.equal(registeredFields().color, field);
});
