"use client";

import { useEffect } from "react";

import type { ThemeMode } from "../theme.js";

/**
 * Keeps the `dark` class on `<html>` in sync.
 *
 * shadcn portals (dropdowns, tooltips, sheets) render in `body`, outside the
 * panel container, so they need the class on the document element. `system`
 * follows `prefers-color-scheme` and reacts to changes.
 */
export function ThemeSync({ mode }: { mode: ThemeMode }) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = mode === "dark" || (mode === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };

    apply();
    if (mode !== "system") return;

    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);

  return null;
}
