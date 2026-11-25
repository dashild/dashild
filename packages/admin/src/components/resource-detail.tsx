import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

import { translate, type Locale, type ResourceDefinition } from "@dashild/core";
import type { RelationManagerData } from "@dashild/core/server";

import { Button } from "../ui/button.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card.js";

import { CellValue } from "./cell-value.js";
import { RelationManager } from "./relation-manager.js";
import type { RelationAction } from "../types.js";

interface ResourceDetailProps {
  resource: ResourceDefinition;
  row: Record<string, unknown>;
  path: string;
  locale?: Locale;
  canUpdate?: boolean;
  relations?: RelationManagerData[];
  relationAction?: RelationAction;
}

export function ResourceDetail({
  resource,
  row,
  path,
  locale,
  canUpdate = true,
  relations = [],
  relationAction,
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

      {relationAction && relations.length > 0 ? (
        <RelationManager
          data={relations}
          parentSlug={resource.navigation.slug}
          parentId={String(row.id)}
          basePath={path}
          locale={locale}
          runAction={relationAction}
        />
      ) : null}
    </div>
  );
}
