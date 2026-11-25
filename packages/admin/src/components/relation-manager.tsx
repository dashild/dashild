"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  translate,
  type Locale,
} from "@dashild/core";
import type {
  RelationActionInput,
  RelationManagerData,
} from "@dashild/core/server";

import { Button } from "../ui/button.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table.js";
import type { SaveResult } from "../types.js";

import { CellValue } from "./cell-value.js";

interface RelationManagerProps {
  data: RelationManagerData[];
  parentSlug: string;
  parentId: string;
  basePath: string;
  locale?: Locale;
  runAction: (input: RelationActionInput) => Promise<SaveResult>;
}

function isDetach(operation: string): boolean {
  return operation === "detach" || operation === "dissociate";
}

export function RelationManager({
  data,
  parentSlug,
  parentId,
  basePath,
  locale,
  runAction,
}: RelationManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Record<string, string>>({});

  if (data.length === 0) return null;

  function execute(
    relation: RelationManagerData,
    operation: RelationActionInput["operation"],
    childId: string,
  ) {
    if (operation === "delete" && !window.confirm(translate(locale, "action.deleteConfirm"))) {
      return;
    }

    startTransition(async () => {
      const result = await runAction({
        parentSlug,
        parentId,
        relation: relation.field,
        operation,
        childId,
      });
      if (!result.ok) {
        toast.error(result.message ?? translate(locale, "error.actionFailed"));
        return;
      }
      toast.success(translate(locale, "shell.actionDone"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {data.map((relation) => {
        const operation =
          relation.kind === "m2m" ? "attach" : "associate";
        const detachOperation =
          relation.kind === "m2m" ? "detach" : "dissociate";
        const selectedId = selected[relation.field] ?? "";

        return (
          <section key={relation.field} className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {relation.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                {relation.kind === "m2m"
                  ? locale === "es"
                    ? "Relación muchos a muchos."
                    : "Many-to-many relation."
                  : locale === "es"
                    ? "Relación uno a muchos."
                    : "One-to-many relation."}
              </p>
            </div>

            {relation.rows.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {locale === "es"
                  ? "No hay registros relacionados."
                  : "No related records."}
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {relation.columns.map((column) => (
                        <TableHead key={column.field}>
                          {column.label ?? column.field}
                        </TableHead>
                      ))}
                      <TableHead className="w-12 text-right">
                        <span className="sr-only">
                          {translate(locale, "shell.actions")}
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relation.rows.map((row) => {
                      const id = String(row.id);
                      return (
                        <TableRow key={id}>
                          {relation.columns.map((column) => (
                            <TableCell key={column.field}>
                              <CellValue
                                value={row[column.field]}
                                row={row}
                                column={column}
                                locale={locale}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button asChild variant="ghost" size="sm">
                                <Link
                                  href={`${basePath}/${relation.childSlug}/${id}/edit`}
                                >
                                  {translate(locale, "action.edit")}
                                </Link>
                              </Button>
                              {relation.canDissociate ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={pending}
                                  onClick={() =>
                                    execute(relation, detachOperation, id)
                                  }
                                >
                                  {relation.kind === "m2m"
                                    ? locale === "es"
                                      ? "Desvincular"
                                      : "Detach"
                                    : locale === "es"
                                      ? "Desasociar"
                                      : "Dissociate"}
                                </Button>
                              ) : null}
                              {relation.canDelete ? (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  disabled={pending}
                                  onClick={() => execute(relation, "delete", id)}
                                >
                                  {translate(locale, "action.delete")}
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`${basePath}/${relation.childSlug}/create`}>
                  {locale === "es" ? "Crear relacionado" : "Create related"}
                </Link>
              </Button>

              {relation.canAssociate && relation.candidates.length > 0 ? (
                <>
                  <select
                    className="h-7 rounded-lg border border-input bg-transparent px-2 text-sm"
                    value={selectedId}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        [relation.field]: event.target.value,
                      }))
                    }
                    aria-label={
                      locale === "es" ? "Seleccionar relacionado" : "Select related"
                    }
                  >
                    <option value="">
                      {locale === "es" ? "Selecciona…" : "Select…"}
                    </option>
                    {relation.candidates.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || selectedId === ""}
                    onClick={() =>
                      selectedId && execute(relation, operation, selectedId)
                    }
                  >
                    {relation.kind === "m2m"
                      ? locale === "es"
                        ? "Vincular"
                        : "Attach"
                      : locale === "es"
                        ? "Asociar"
                        : "Associate"}
                  </Button>
                </>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
