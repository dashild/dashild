import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCsv, toCsv } from "../src/csv.js";

test("toCsv quotes commas, quotes and newlines", () => {
  const csv = toCsv(
    ["name", "notes"],
    [
      ["Acme", "Line one\nLine two"],
      ['He said "hi"', "a,b"],
    ],
  );

  assert.equal(
    csv,
    'name,notes\nAcme,"Line one\nLine two"\n"He said ""hi""","a,b"\n',
  );
});

test("parseCsv reads quoted cells and CRLF", () => {
  const rows = parseCsv(
    '\uFEFFname,notes\r\nAcme,"Line one\nLine two"\r\n"He said ""hi""","a,b"\r\n',
  );

  assert.deepEqual(rows, [
    ["name", "notes"],
    ["Acme", "Line one\nLine two"],
    ['He said "hi"', "a,b"],
  ]);
});

test("parseCsv skips empty lines and handles trailing newlines", () => {
  assert.deepEqual(parseCsv("a,b\n1,2\n\n3,4\n"), [
    ["a", "b"],
    ["1", "2"],
    ["3", "4"],
  ]);
});
