import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Plus,
  SearchX,
} from "lucide-react";

import {
  resolveTableActions,
  translate,
  type Locale,
  type ResourceDefinition,
} from "@dashild/core";
import type { NormalizedListParams } from "@dashild/core/server";

import { Button } from "../ui/button.js";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty.js";
import { Input } from "../ui/input.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table.js";
import type { DeleteAction, RunAction } from "../types.js";

import { ActionButton } from "./action-button.js";
import { CellValue } from "./cell-value.js";
import { RowActions } from "./row-actions.js";

interface ResourceTableProps {
  resource: ResourceDefinition;
  rows: Record<string, unknown>[];
  total: number;
  params: NormalizedListParams;
  basePath: string;
  locale?: Locale;
  canCreate?: boolean;
  canView?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  /** Custom actions the server allowed for this user. */
  allowedActions?: string[];
  deleteAction: DeleteAction;
  runAction: RunAction;
}

export function ResourceTable({
  resource,
  rows,
  total,
  params,
  basePath,
  locale,
  canCreate = true,
  canView = true,
  canUpdate = true,
  canDelete = true,
  allowedActions,
  deleteAction,
  runAction,
}: ResourceTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / params.perPage));

  const actions = resolveTableActions(resource, locale).filter((action) => {
    switch (action.name) {
      case "create":
        return canCreate;
      case "view":
        return canView;
      case "edit":
        return canUpdate;
      case "delete":
        return canDelete;
      default:
        return allowedActions?.includes(action.name) ?? true;
    }
  });
  const headerActions = actions.filter(
    (action) => action.name === "create" || action.placement === "header",
  );
  const rowActions = actions.filter(
    (action) => action.name !== "create" && action.placement !== "header",
  );

  const current: Record<string, string | undefined> = {
    q: params.search ?? undefined,
    sort: params.sort ?? undefined,
    dir: params.sort ? params.direction : undefined,
    page: params.page > 1 ? String(params.page) : undefined,
  };
  for (const filter of params.filters) current[filter.field] = filter.value;

  const href = (overrides: Record<string, string | number | undefined>) => {
    const values = { ...current };
    for (const [key, value] of Object.entries(overrides)) {
      values[key] = value === undefined ? undefined : String(value);
    }
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value) search.set(key, value);
    }
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const records =
    total === 1
      ? translate(locale, "shell.record", { count: total })
      : translate(locale, "shell.records", { count: total });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {resource.navigation.label}
          </h1>
          <p className="text-sm text-muted-foreground">{records}</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {headerActions.map((action) =>
            action.name === "create" ? (
              <Button
                key={action.name}
                asChild
                size="sm"
                variant={action.variant ?? "default"}
              >
                <Link href={`${basePath}/create`}>
                  <Plus data-icon="inline-start" />
                  {action.label ?? translate(locale, "action.create")}
                </Link>
              </Button>
            ) : (
              <ActionButton
                key={action.name}
                action={action}
                slug={resource.navigation.slug}
                runAction={runAction}
                locale={locale}
              />
            ),
          )}

          <form
            action={basePath}
            method="get"
            className="flex w-full items-center gap-2 sm:w-auto"
          >
            <Input
              type="search"
              name="q"
              defaultValue={params.search ?? ""}
              placeholder={translate(locale, "shell.searchPlaceholder")}
              aria-label={translate(locale, "shell.search")}
              className="sm:w-64"
            />
            {current.sort ? (
              <input type="hidden" name="sort" value={current.sort} />
            ) : null}
            {current.dir ? (
              <input type="hidden" name="dir" value={current.dir} />
            ) : null}
            {params.filters.map((filter) => (
              <input
                key={filter.field}
                type="hidden"
                name={filter.field}
                value={filter.value}
              />
            ))}
            <Button type="submit" variant="secondary">
              {translate(locale, "shell.search")}
            </Button>
            {params.search ? (
              <Button asChild variant="ghost">
                <Link href={href({ q: undefined, page: undefined })}>
                  {translate(locale, "shell.clear")}
                </Link>
              </Button>
            ) : null}
          </form>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{translate(locale, "shell.noResults")}</EmptyTitle>
            <EmptyDescription>
              {params.search
                ? translate(locale, "shell.noMatches", {
                    query: params.search,
                  })
                : translate(locale, "shell.empty")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                {resource.table.columns.map((column) => (
                  <TableHead key={column.field}>
                    {column.sortable ? (
                      <Link
                        href={href({
                          sort: column.field,
                          dir:
                            column.field === params.sort &&
                            params.direction === "asc"
                              ? "desc"
                              : "asc",
                          page: 1,
                        })}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {column.label ?? column.field}
                        {column.field === params.sort ? (
                          params.direction === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-50" />
                        )}
                      </Link>
                    ) : (
                      (column.label ?? column.field)
                    )}
                  </TableHead>
                ))}
                {rowActions.length > 0 ? (
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">
                      {translate(locale, "shell.actions")}
                    </span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={String(row.id)}>
                  {resource.table.columns.map((column) => (
                    <TableCell key={column.field}>
                      <CellValue
                        value={row[column.field]}
                        row={row}
                        column={column}
                        locale={locale}
                      />
                    </TableCell>
                  ))}
                  {rowActions.length > 0 ? (
                    <TableCell className="text-right">
                      <RowActions
                        slug={resource.navigation.slug}
                        id={String(row.id)}
                        actions={rowActions}
                        viewHref={`${basePath}/${String(row.id)}`}
                        editHref={`${basePath}/${String(row.id)}/edit`}
                        deleteAction={deleteAction}
                        runAction={runAction}
                        locale={locale}
                              />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm" disabled={params.page <= 1}>
          <Link
            href={href({ page: params.page - 1 })}
            aria-disabled={params.page <= 1}
            className={params.page <= 1 ? "pointer-events-none opacity-50" : ""}
          >
            {translate(locale, "shell.previous")}
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">
          {translate(locale, "shell.page", {
            page: params.page,
            total: totalPages,
          })}
        </span>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={params.page >= totalPages}
        >
          <Link
            href={href({ page: params.page + 1 })}
            aria-disabled={params.page >= totalPages}
            className={
              params.page >= totalPages ? "pointer-events-none opacity-50" : ""
            }
          >
            {translate(locale, "shell.next")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
