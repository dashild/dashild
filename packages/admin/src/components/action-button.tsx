"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { Spinner } from "../ui/spinner.js";
import type { RunAction } from "../types.js";

import { useIcons } from "../icon-context.js";
import { resolveIcon } from "./icon-map.js";

interface ActionButtonProps {
  action: ActionDefinition;
  slug: string;
  id?: string;
  getValues?: () => Record<string, unknown>;
  runAction: RunAction;
  locale?: Locale;
  size?: "sm" | "default";
}

/**
 * Botón de una acción personalizada.
 *
 * La lógica no vive aquí: `runAction` es la acción genérica de servidor, que
 * resuelve el handler por nombre. Esto solo maneja confirmación, pending y
 * feedback.
 */
export function ActionButton({
  action,
  slug,
  id,
  getValues,
  runAction,
  locale,
  size = "sm",
}: ActionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const icons = useIcons();
  const Icon = resolveIcon(action.icon, icons);
  const label = action.label ?? action.name;
  const variant = action.variant ?? "outline";

  if (action.href) {
    return (
      <Button asChild size={size} variant={variant}>
        <Link href={action.href.replace("{id}", id ?? "")}>
          {Icon ? <Icon data-icon="inline-start" /> : null}
          {label}
        </Link>
      </Button>
    );
  }

  function execute() {
    startTransition(async () => {
      const result = await runAction({
        slug,
        name: action.name,
        id,
        values: getValues?.(),
        data: action.data,
      });

      setOpen(false);

      if (!result.ok) {
        toast.error(result.message ?? translate(locale, "error.actionFailed"));
        return;
      }

      toast.success(result.message ?? translate(locale, "shell.confirm"));
      router.refresh();
      if (result.href) router.push(result.href);
    });
  }

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={pending}
        onClick={() => (action.confirm ? setOpen(true) : execute())}
      >
        {pending ? (
          <Spinner data-icon="inline-start" />
        ) : Icon ? (
          <Icon data-icon="inline-start" />
        ) : null}
        {label}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{label}</AlertDialogTitle>
            <AlertDialogDescription>
              {typeof action.confirm === "string"
                ? action.confirm
                : translate(locale, "shell.confirmAction")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{translate(locale, "action.cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant={variant}
              onClick={execute}
              disabled={pending}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {translate(locale, "shell.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
