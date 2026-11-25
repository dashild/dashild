"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import {
  translate,
  type ActionDefinition,
  type Locale,
  type ResourceDefinition,
} from "@dashild/core";
import type { NormalizedListParams } from "@dashild/core/server";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table.js";
import type { DeleteAction, RunAction } from "../types.js";

import { CellValue } from "./cell-value.js";
import { RowActions } from "./row-actions.js";

interface DataTableProps {
  resource: ResourceDefinition;
  rows: Record<string, unknown>[];
  params: NormalizedListParams;
  basePath: string;
  locale?: Locale;
  actions: ActionDefinition[];
  deleteAction: DeleteAction;
  runAction: RunAction;
}

function hrefFor(
  basePath: string,
  params: NormalizedListParams,
  overrides: Record<string, string | number | undefined>,
): string {
  const current: Record<string, string | undefined> = {
    q: params.search ?? undefined,
    sort: params.sort ?? undefined,
    dir: params.sort ? params.direction : undefined,
    page: params.page > 1 ? String(params.page) : undefined,
  };
  for (const filter of params.filters) current[filter.field] = filter.value;

  for (const [key, value] of Object.entries(overrides)) {
    current[key] = value === undefined ? undefined : String(value);
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** TanStack Table renderer for server-driven rows. */
export function DataTable({
  resource,
  rows,
  params,
  basePath,
  locale,
  actions,
  deleteAction,
  runAction,
}: DataTableProps) {
  const columns: ColumnDef<Record<string, unknown>>[] =
    resource.table.columns.map((column) => ({
      id: column.field,
      accessorFn: (row) => row[column.field],
      header: () => {
        if (!column.sortable) return column.label ?? column.field;
        const isSorted = column.field === params.sort;
        return (
          <Link
            href={hrefFor(basePath, params, {
              sort: column.field,
              dir:
                isSorted && params.direction === "asc" ? "desc" : "asc",
              page: 1,
            })}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            {column.label ?? column.field}
            {isSorted ? (
              params.direction === "asc" ? (
                <ArrowUp className="size-3" />
              ) : (
                <ArrowDown className="size-3" />
              )
            ) : (
              <ArrowUpDown className="size-3 opacity-50" />
            )}
          </Link>
        );
      },
      cell: ({ row }) => (
        <CellValue
          value={row.original[column.field]}
          row={row.original}
          column={column}
          locale={locale}
        />
      ),
    }));

  if (actions.length > 0) {
    columns.push({
      id: "actions",
      header: () => (
        <span className="sr-only">{translate(locale, "shell.actions")}</span>
      ),
      cell: ({ row }) => (
        <RowActions
          slug={resource.navigation.slug}
          id={String(row.original.id)}
          actions={actions}
          viewHref={`${basePath}/${String(row.original.id)}`}
          editHref={`${basePath}/${String(row.original.id)}/edit`}
          deleteAction={deleteAction}
          runAction={runAction}
          locale={locale}
        />
      ),
    });
  }

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={header.id === "actions" ? "w-12 text-right" : undefined}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={
                    cell.column.id === "actions" ? "text-right" : undefined
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
