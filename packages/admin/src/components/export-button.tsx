"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { translate, type Locale } from "@dashild/core";

import { Button } from "../ui/button.js";
import { Spinner } from "../ui/spinner.js";
import type { ExportAction } from "../types.js";

interface ExportButtonProps {
  slug: string;
  params: Record<string, string | string[] | undefined>;
  action: ExportAction;
  locale?: Locale;
}

export function ExportButton({
  slug,
  params,
  action,
  locale,
}: ExportButtonProps) {
  const [pending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      const result = await action({ slug, params });
      if (!result.ok || !result.csv) {
        toast.error(result.message ?? translate(locale, "shell.exportFailed"));
        return;
      }

      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename ?? `${slug}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(
        translate(locale, "shell.exported", { rows: result.rows ?? 0 }),
      );
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={download}
    >
      {pending ? <Spinner data-icon="inline-start" /> : <Download />}
      {translate(locale, "shell.export")}
    </Button>
  );
}
