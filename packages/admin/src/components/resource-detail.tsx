import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

import { translate, type Locale, type ResourceDefinition } from "@dashild/core";

import { Button } from "../ui/button.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card.js";

import { CellValue } from "./cell-value.js";

interface ResourceDetailProps {
  resource: ResourceDefinition;
  row: Record<string, unknown>;
  path: string;
  locale?: Locale;
  canUpdate?: boolean;
}

export function ResourceDetail({
  resource,
  row,
  path,
  locale,
  canUpdate = true,
}: ResourceDetailProps) {
  const basePath = `${path}/${resource.navigation.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {resource.navigation.label}
          </h1>
          <p className="text-sm text-muted-foreground">
            {translate(locale, "shell.detailSubtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={basePath}>
              <ArrowLeft data-icon="inline-start" />
              {translate(locale, "shell.back")}
            </Link>
          </Button>
          {canUpdate ? (
            <Button asChild size="sm">
              <Link href={`${basePath}/${String(row.id)}/edit`}>
                <Pencil data-icon="inline-start" />
                {translate(locale, "action.edit")}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate(locale, "shell.data")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            {resource.table.columns.map((column) => (
              <div key={column.field} className="flex flex-col gap-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {column.label ?? column.field}
                </dt>
                <dd className="text-sm">
                  <CellValue
                        value={row[column.field]}
                        row={row}
                        column={column}
                        locale={locale}
                      />
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
