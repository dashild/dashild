import assert from "node:assert/strict";
import { test } from "node:test";

import { translate } from "../src/index.js";

test("catalog: interpolation by locale", () => {
  assert.equal(
    translate("en", "validation.minLength", { min: 3 }),
    "Must be at least 3 characters.",
  );
  assert.equal(
    translate("es", "validation.minLength", { min: 3 }),
    "Mínimo 3 caracteres.",
  );
});

test("catalog: unknown locale falls back to English", () => {
  assert.equal(
    translate("fr" as "en", "action.create"),
    "Create",
  );
});

test("catalog: a missing key is visible, not silent", () => {
  assert.equal(
    translate("en", "missing.key" as "action.create"),
    "missing.key",
  );
});
