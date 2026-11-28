"use client";

import { Upload } from "lucide-react";
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { translate, type Locale } from "@dashild/core";

import { Button } from "../ui/button.js";
import { Spinner } from "../ui/spinner.js";
import type { ImportAction } from "../types.js";

interface ImportButtonProps {
  slug: string;
  action: ImportAction;
  locale?: Locale;
}

export function ImportButton({
  slug,
  action,
  locale,
}: ImportButtonProps) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    startTransition(async () => {
      const csv = await file.text();
      const result = await action({ slug, csv });

      if (!result.ok) {
        const detail = result.errors?.[0]?.message;
        toast.error(
          detail ?? result.message ?? translate(locale, "shell.importFailed"),
        );
      } else {
        toast.success(
          translate(locale, "shell.imported", {
            imported: result.imported ?? 0,
            failed: result.failed ?? 0,
          }),
        );
      }

      if (input.current) input.current.value = "";
      router.refresh();
    });
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => input.current?.click()}
      >
        {pending ? <Spinner data-icon="inline-start" /> : <Upload />}
        {translate(locale, "shell.import")}
      </Button>
    </>
  );
}
