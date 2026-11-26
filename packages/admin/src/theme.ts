import type { PanelColor } from "@dashild/core";

/**
 * Pure theme helpers.
 *
 * The app resolves the mode from its cookie and passes it to the shell; this
 * module only maps a palette name to CSS variables and a content width to a
 * Tailwind class.
 */

export type ThemeMode = "light" | "dark" | "system";

/** Default panel mode. The app mirrors it in the root layout. */
export const DEFAULT_THEME_MODE: ThemeMode = "dark";

/** Default panel primary color. */
export const DEFAULT_PANEL_PRIMARY: PanelColor = "indigo";

interface Palette {
  light: string;
  dark: string;
  foreground: { light: string; dark: string };
}

/**
 * Paletas primarias. Son colores de Tailwind en hex; shadcn acepta cualquier
 * color CSS en sus variables. `foreground` garantiza contraste en cada modo.
 */
const PALETTES: Record<PanelColor, Palette> = {
  amber: {
    light: "#d97706",
    dark: "#fbbf24",
    foreground: { light: "#ffffff", dark: "#1c1917" },
  },
  blue: {
    light: "#2563eb",
    dark: "#60a5fa",
    foreground: { light: "#ffffff", dark: "#0f172a" },
  },
  cyan: {
    light: "#0891b2",
    dark: "#22d3ee",
    foreground: { light: "#ffffff", dark: "#083344" },
  },
  emerald: {
    light: "#059669",
    dark: "#34d399",
    foreground: { light: "#ffffff", dark: "#022c22" },
  },
  fuchsia: {
    light: "#c026d3",
    dark: "#e879f9",
    foreground: { light: "#ffffff", dark: "#2e1065" },
  },
  gray: {
    light: "#4b5563",
    dark: "#9ca3af",
    foreground: { light: "#ffffff", dark: "#111827" },
  },
  green: {
    light: "#16a34a",
    dark: "#4ade80",
    foreground: { light: "#ffffff", dark: "#052e16" },
  },
  indigo: {
    light: "#4f46e5",
    dark: "#818cf8",
    foreground: { light: "#ffffff", dark: "#1e1b4b" },
  },
  lime: {
    light: "#65a30d",
    dark: "#a3e635",
    foreground: { light: "#ffffff", dark: "#1a2e05" },
  },
  neutral: {
    light: "#525252",
    dark: "#a3a3a3",
    foreground: { light: "#ffffff", dark: "#0a0a0a" },
  },
  orange: {
    light: "#ea580c",
    dark: "#fb923c",
    foreground: { light: "#ffffff", dark: "#1c1917" },
  },
  pink: {
    light: "#db2777",
    dark: "#f472b6",
    foreground: { light: "#ffffff", dark: "#500724" },
  },
  red: {
    light: "#dc2626",
    dark: "#f87171",
    foreground: { light: "#ffffff", dark: "#450a0a" },
  },
  rose: {
    light: "#e11d48",
    dark: "#fb7185",
    foreground: { light: "#ffffff", dark: "#1f0a10" },
  },
  sky: {
    light: "#0284c7",
    dark: "#38bdf8",
    foreground: { light: "#ffffff", dark: "#082f49" },
  },
  slate: {
    light: "#475569",
    dark: "#94a3b8",
    foreground: { light: "#ffffff", dark: "#0f172a" },
  },
  stone: {
    light: "#57534e",
    dark: "#a8a29e",
    foreground: { light: "#ffffff", dark: "#0c0a09" },
  },
  teal: {
    light: "#0d9488",
    dark: "#2dd4bf",
    foreground: { light: "#ffffff", dark: "#042f2e" },
  },
  violet: {
    light: "#7c3aed",
    dark: "#a78bfa",
    foreground: { light: "#ffffff", dark: "#1e1b4b" },
  },
  yellow: {
    light: "#ca8a04",
    dark: "#facc15",
    foreground: { light: "#ffffff", dark: "#422006" },
  },
  zinc: {
    light: "#52525b",
    dark: "#a1a1aa",
    foreground: { light: "#ffffff", dark: "#09090b" },
  },
};

export function panelThemeStyle(primary: PanelColor | undefined): string {
  if (!primary) return "";

  // `primary` viene de un archivo de datos: el tipo no protege en runtime. Un
  // nombre desconocido no puede tumbar el panel.
  const palette = PALETTES[primary];
  if (!palette) return "";

  // Se aplica en `:root` y `.dark`, no en un contenedor: los dropdowns de
  // shadcn se renderizan en un portal en `body`, fuera del árbol del panel.
  return `
:root {
  --primary: ${palette.light};
  --primary-foreground: ${palette.foreground.light};
  --sidebar-primary: ${palette.light};
  --sidebar-primary-foreground: ${palette.foreground.light};
  --ring: ${palette.light};
}
.dark {
  --primary: ${palette.dark};
  --primary-foreground: ${palette.foreground.dark};
  --sidebar-primary: ${palette.dark};
  --sidebar-primary-foreground: ${palette.foreground.dark};
  --ring: ${palette.dark};
}`.trim();
}

export function maxWidthClass(width: "sm" | "md" | "lg" | "xl" | "full" | undefined): string {
  switch (width) {
    case "sm":
      return "max-w-3xl";
    case "md":
      return "max-w-5xl";
    case "lg":
      return "max-w-6xl";
    case "xl":
      return "max-w-7xl";
    case "full":
      return "max-w-none";
    default:
      return "max-w-7xl";
  }
}
