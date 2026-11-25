import type { PanelColor } from "@dashild/core";

import { panelThemeStyle, type ThemeMode } from "../theme.js";

import { ThemeSync } from "./theme-sync.js";

interface PanelThemeProps {
  mode: ThemeMode;
  primary?: PanelColor;
  children: React.ReactNode;
}

/**
 * Tema del panel.
 *
 * Las variables (`--primary`, `--sidebar-primary`) se aplican en `:root` /
 * `.dark` para que lleguen también a los portales de shadcn, que se renderizan
 * en `body`. La clase `dark` del `<html>` la pone el layout raíz leyendo la
 * cookie; aquí solo se sincroniza en navegaciones de cliente.
 */
export function PanelTheme({ mode, primary, children }: PanelThemeProps) {
  return (
    <>
      <style>{panelThemeStyle(primary)}</style>
      <ThemeSync mode={mode} />
      {children}
    </>
  );
}
