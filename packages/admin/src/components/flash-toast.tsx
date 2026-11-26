"use client";

import { useEffect } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { translate, type Locale } from "@dashild/core";

/**
 * Shows the result of a server redirect (`?flash=saved|deleted`) and removes
 * the query so a refresh does not repeat the toast.
 */
export function FlashToast({ locale }: { locale?: Locale }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const flash = searchParams.get("flash");
    if (!flash) return;

    toast.success(
      translate(locale, flash === "deleted" ? "shell.deleted" : "shell.saved"),
    );

    const next = new URLSearchParams(searchParams.toString());
    next.delete("flash");
    router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, {
      scroll: false,
    });
  }, [locale, pathname, router, searchParams]);

  return null;
}
