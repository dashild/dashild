"use client";

import { useRef } from "react";

import type { Locale } from "@dashild/core";

import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";

function base64Size(value: string): number | null {
  try {
    return Math.floor((atob(value).length * 3) / 4);
  } catch {
    return null;
  }
}

function formatSize(bytes: number | null, locale?: Locale): string {
  if (bytes === null) return locale === "es" ? "Valor inválido" : "Invalid value";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** File input for Prisma Bytes; stores base64 in the form value. */
export function BytesField({
  id,
  value,
  onChange,
  onBlur,
  locale,
}: {
  id: string;
  value: unknown;
  onChange: (value: string) => void;
  onBlur: () => void;
  locale?: Locale;
}) {
  const input = useRef<HTMLInputElement>(null);
  const current = typeof value === "string" ? value : "";
  const size = current ? base64Size(current) : 0;

  async function onFile(file: File | undefined) {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (const byte of bytes) binary += String.fromCharCode(byte);
    onChange(btoa(binary));
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        ref={input}
        type="file"
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
        onBlur={onBlur}
      />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {current
            ? locale === "es"
              ? `Archivo actual: ${formatSize(size, locale)}`
              : `Current file: ${formatSize(size, locale)}`
            : locale === "es"
              ? "Sin archivo."
              : "No file."}
        </span>
        {current ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              if (input.current) input.current.value = "";
            }}
          >
            {locale === "es" ? "Quitar" : "Remove"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
