import Link from "next/link";

import {
  translate,
  type FilterDefinition,
  type Locale,
} from "@dashild/core";
import type { NormalizedListParams } from "@dashild/core/server";

import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import type { FormOption } from "../types.js";

interface FilterBarProps {
  filters: FilterDefinition[];
  options: Record<string, FormOption[]>;
  params: NormalizedListParams;
  basePath: string;
  locale?: Locale;
}

const CONTROL =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none transition-[color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Server-rendered filter controls.
 *
 * A plain GET form keeps every filter in the URL, so the browser and the server
 * share one source of truth and no client JavaScript is required. Empty values
 * are ignored by `normalizeListParams`.
 */
export function FilterBar({
  filters,
  options,
  params,
  basePath,
  locale,
}: FilterBarProps) {
  const active = new Map(
    params.filters.map((entry) => [entry.field, entry.value]),
  );

  const clearHref = () => {
    const search = new URLSearchParams();
    if (params.search) search.set("q", params.search);
    if (params.sort) {
      search.set("sort", params.sort);
      search.set("dir", params.direction);
    }
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <form
      action={basePath}
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3"
      aria-label={translate(locale, "shell.filters")}
    >
      {params.search ? (
        <input type="hidden" name="q" value={params.search} />
      ) : null}
      {params.sort ? (
        <>
          <input type="hidden" name="sort" value={params.sort} />
          <input type="hidden" name="dir" value={params.direction} />
        </>
      ) : null}

      {filters.map((filter) => {
        const value = active.get(filter.field) ?? "";
        const list = options[filter.field] ?? [];
        const id = `filter-${filter.field}`;

        return (
          <div key={filter.field} className="flex min-w-40 flex-col gap-1">
            <label
              htmlFor={id}
              className="text-xs font-medium text-muted-foreground"
            >
              {filter.label ?? filter.field}
            </label>

            {filter.type === "boolean" ? (
              <select
                id={id}
                name={filter.field}
                defaultValue={value}
                className={CONTROL}
              >
                <option value="">
                  {translate(locale, "shell.anyOption")}
                </option>
                <option value="true">{translate(locale, "shell.yes")}</option>
                <option value="false">{translate(locale, "shell.no")}</option>
              </select>
            ) : filter.type === "enum" || filter.type === "relation" ? (
              <select
                id={id}
                name={filter.field}
                defaultValue={value}
                className={CONTROL}
              >
                <option value="">
                  {translate(locale, "shell.anyOption")}
                </option>
                {list.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={id}
                name={filter.field}
                type={
                  filter.type === "date"
                    ? "date"
                    : filter.type === "number"
                      ? "number"
                      : "text"
                }
                step={filter.type === "number" ? "any" : undefined}
                defaultValue={value}
                className="h-9"
              />
            )}
          </div>
        );
      })}

      <Button type="submit" size="sm" variant="secondary">
        {translate(locale, "shell.apply")}
      </Button>

      {params.filters.length > 0 ? (
        <Button asChild size="sm" variant="ghost">
          <Link href={clearHref()}>
            {translate(locale, "shell.clearFilters")}
          </Link>
        </Button>
      ) : null}
    </form>
  );
}
