import { cookies } from "next/headers";

import type { ThemeMode } from "@dashild/admin";

export {
  DEFAULT_PANEL_PRIMARY,
  DEFAULT_THEME_MODE,
  maxWidthClass,
  panelThemeStyle,
  type ThemeMode,
} from "@dashild/admin";

/**
 * Tema del panel.
 *
 * Se guarda en cookie y se resuelve en servidor: el HTML sale ya con la clase
 * correcta y no hay parpadeo ni desajuste de hidratación. No toca el layout
 * raíz de la app; el `.dark` se aplica al contenedor del panel.
 */

export const THEME_COOKIE = "dashild_theme";

export async function getThemeMode(
  fallback: ThemeMode = "light",
): Promise<ThemeMode> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === "dark" || value === "light" || value === "system"
    ? value
    : fallback;
}
