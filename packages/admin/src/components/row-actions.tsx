"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ElementType } from "react";
import { toast } from "sonner";

import { translate, type ActionDefinition, type Locale } from "@dashild/core";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog.js";
import { Button } from "../ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";
import { Spinner } from "../ui/spinner.js";
import type { DeleteAction, RunAction } from "../types.js";

import { useIcons } from "../icon-context.js";
import { resolveIcon, type IconMap } from "./icon-map.js";

interface RowActionsProps {
  slug: string;
  id: string;
  actions: ActionDefinition[];
  viewHref: string;
  editHref: string;
  deleteAction: DeleteAction;
  runAction: RunAction;
  locale?: Locale;
}

type Pending =
  | { kind: "delete" }
  | { kind: "action"; action: ActionDefinition };

function iconFor(
  action: ActionDefinition,
  icons: IconMap,
): ElementType | undefined {
  if (action.name === "view") return Eye;
  if (action.name === "edit") return Pencil;
  if (action.name === "delete") return Trash2;
  return resolveIcon(action.icon, icons);
}

export function RowActions({
  slug,
  id,
  actions,
  viewHref,
  editHref,
  deleteAction,
  runAction,
  locale,
}: RowActionsProps) {
  const router = useRouter();
  const icons = useIcons();
  const [pendingConfirm, setPendingConfirm] = useState<Pending | null>(null);
  const [pending, startTransition] = useTransition();

  if (actions.length === 0) return null;

  function execute(target: Pending) {
    startTransition(async () => {
      if (target.kind === "delete") {
        const result = await deleteAction({ slug, id });
        setPendingConfirm(null);
        if (!result.ok) {
          toast.error(result.message ?? translate(locale, "error.deleteFailed"));
        }
        return;
      }

      const { action } = target;
      const result = await runAction({
        slug,
        name: action.name,
        id,
        data: action.data,
      });
      setPendingConfirm(null);

      if (!result.ok) {
        toast.error(result.message ?? translate(locale, "error.actionFailed"));
        return;
      }

      toast.success(result.message ?? translate(locale, "shell.actionDone"));
      if (result.href) router.push(result.href);
    });
  }

  function select(action: ActionDefinition) {
    if (action.confirm) {
      setPendingConfirm({ kind: "action", action });
    } else {
      execute({ kind: "action", action });
    }
  }

  const isDelete = pendingConfirm?.kind === "delete";
  const pendingAction =
    pendingConfirm?.kind === "action" ? pendingConfirm.action : undefined;
  const title = isDelete
    ? translate(locale, "shell.deleteTitle")
    : (pendingAction?.label ?? translate(locale, "shell.confirm"));
  const description = isDelete
    ? translate(locale, "action.deleteConfirm")
    : typeof pendingAction?.confirm === "string"
      ? pendingAction.confirm
      : translate(locale, "shell.confirmAction");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal />
            <span className="sr-only">{translate(locale, "shell.actions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {actions.map((action) => {
              const Icon = iconFor(action, icons);
              const label = action.label ?? action.name;

              if (action.name === "view") {
                return (
                  <DropdownMenuItem key={action.name} asChild>
                    <Link href={viewHref}>
                      <Eye />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                );
              }

              if (action.name === "edit") {
                return (
                  <DropdownMenuItem key={action.name} asChild>
                    <Link href={editHref}>
                      <Pencil />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                );
              }

              if (action.name === "delete") {
                return (
                  <DropdownMenuItem
                    key={action.name}
                    variant="destructive"
                    onSelect={(event) => {
                      event.preventDefault();
                      setPendingConfirm({ kind: "delete" });
                    }}
                  >
                    <Trash2 />
                    {label}
                  </DropdownMenuItem>
                );
              }

              if (action.href) {
                return (
                  <DropdownMenuItem key={action.name} asChild>
                    <Link href={action.href.replace("{id}", id)}>
                      {Icon ? <Icon /> : null}
                      {label}
                    </Link>
                  </DropdownMenuItem>
                );
              }

              return (
                <DropdownMenuItem
                  key={action.name}
                  onSelect={(event) => {
                    event.preventDefault();
                    select(action);
                  }}
                >
                  {Icon ? <Icon /> : null}
                  {label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{translate(locale, "action.cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant={
                isDelete
                  ? "destructive"
                  : (pendingAction?.variant ?? "default")
              }
              disabled={pending}
              onClick={() => pendingConfirm && execute(pendingConfirm)}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {isDelete ? translate(locale, "action.delete") : translate(locale, "shell.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
