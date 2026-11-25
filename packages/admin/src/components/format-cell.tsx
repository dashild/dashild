import type { ColumnDefinition, Locale } from "@dashild/core";

import { Badge } from "../ui/badge.js";

const TONE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  accent: "default",
  green: "secondary",
  muted: "outline",
  danger: "destructive",
};

/**
 * Formats a value according to the resource column.
 *
 * Shared by the table and the detail view: the same datum looks the same in
 * both places. Dates follow the panel locale instead of a hardcoded locale.
 */
export function formatCell(
  value: unknown,
  column: ColumnDefinition,
  locale: Locale = "en",
) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  if (column.display && typeof value === "object" && !Array.isArray(value)) {
    const relation = value as { display?: unknown; id?: unknown };
    return String(relation.display ?? relation.id ?? "—");
  }

  const intlLocale = locale === "es" ? "es-ES" : "en-US";

  switch (column.format) {
    case "badge": {
      const tone = column.tone?.[String(value)] ?? "muted";
      return (
        <Badge variant={TONE_VARIANT[tone] ?? "outline"}>
          {String(value)}
        </Badge>
      );
    }
    case "datetime":
      return new Intl.DateTimeFormat(intlLocale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(String(value)));
    case "date":
      return new Intl.DateTimeFormat(intlLocale, {
        dateStyle: "medium",
      }).format(new Date(String(value)));
    case "json":
      return (
        <code className="text-xs text-muted-foreground">
          {JSON.stringify(value)}
        </code>
      );
    default:
      return String(value);
  }
}
