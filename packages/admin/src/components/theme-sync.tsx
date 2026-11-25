"use client";

import { useEffect } from "react";

import type { ThemeMode } from "../theme.js";

/**
 * Sincroniza la clase `dark` en `<html>`.
 *
 * Es lo que hace que los portales de shadcn (dropdowns, tooltips, sheets)
 * hereden el tema: se renderizan en `body`, fuera del contenedor del panel.
 * El script inline de `PanelTheme` lo aplica antes de hidratar; esto lo
 * mantiene al día cuando cambia el tema sin recargar.
 */
export function ThemeSync({ mode }: { mode: ThemeMode }) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  return null;
}
