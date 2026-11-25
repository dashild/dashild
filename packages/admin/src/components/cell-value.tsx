"use client";

import type { ColumnDefinition, Locale } from "@dashild/core";

import { useRegistry } from "../registry.js";
import { formatCell } from "./format-cell.js";

/** Renders a column value, preferring a cell registered by the app. */
export function CellValue({
  value,
  row,
  column,
  locale,
}: {
  value: unknown;
  row: Record<string, unknown>;
  column: ColumnDefinition;
  locale?: Locale;
}) {
  const { cells } = useRegistry();
  const Renderer = column.cell ? cells[column.cell] : undefined;

  if (Renderer) {
    return (
      <Renderer value={value} row={row} column={column} locale={locale} />
    );
  }

  return <>{formatCell(value, column, locale)}</>;
}
