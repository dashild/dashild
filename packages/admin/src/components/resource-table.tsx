import Link from "next/link";
import { Plus, SearchX } from "lucide-react";

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
import type {
  DeleteAction,
  ExportAction,
  FormOption,
  ImportAction,
  RunAction,
} from "../types.js";

import { ActionButton } from "./action-button.js";
import { DataTable } from "./data-table.js";
import { ExportButton } from "./export-button.js";
import { FilterBar } from "./filter-bar.js";
import { ImportButton } from "./import-button.js";

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
  /** Options for enum and relation filters, resolved on the server. */
  filterOptions?: Record<string, FormOption[]>;
  exportAction?: ExportAction;
  importAction?: ImportAction;
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
  filterOptions,
  exportAction,
  importAction,
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

  const exportParams: Record<string, string> = {};
  if (params.search) exportParams.q = params.search;
  if (params.sort) {
    exportParams.sort = params.sort;
    exportParams.dir = params.direction;
  }
  for (const filter of params.filters) {
    exportParams[filter.field] = filter.value;
  }

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
          {exportAction ? (
            <ExportButton
              slug={resource.navigation.slug}
              params={exportParams}
              action={exportAction}
              locale={locale}
            />
          ) : null}
          {importAction && canCreate ? (
            <ImportButton
              slug={resource.navigation.slug}
              action={importAction}
              locale={locale}
            />
          ) : null}
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

      {resource.table.filters?.length ? (
        <FilterBar
          filters={resource.table.filters}
          options={filterOptions ?? {}}
          params={params}
          basePath={basePath}
          locale={locale}
        />
      ) : null}

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
        <DataTable
          resource={resource}
          rows={rows}
          params={params}
          basePath={basePath}
          locale={locale}
          actions={rowActions}
          deleteAction={deleteAction}
          runAction={runAction}
        />
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
