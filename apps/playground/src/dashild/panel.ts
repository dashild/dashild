import { definePanel } from "@dashild/core";

import { signOut } from "@/lib/auth-actions";
import { getCurrentUser } from "@/lib/session";
import {
  DEFAULT_PANEL_PRIMARY,
  DEFAULT_THEME_MODE,
} from "@/lib/theme";
import { organizationResource } from "./resources/organization";
import { userResource } from "./resources/user";

/**
 * Panel administrativo de la app de ejemplo.
 *
 * Como en Filament, esto declara lo básico: ruta, marca, tema, colores, sidebar
 * y usuario actual. El shell se construye con shadcn; los recursos son datos.
 */
export const panel = definePanel({
  title: "Acme Admin",
  path: "/admin",
  locale: "es",

  brand: {
    name: "Acme",
  },

  theme: {
    defaultMode: DEFAULT_THEME_MODE,
    toggle: true,
    primary: DEFAULT_PANEL_PRIMARY,
  },

  sidebar: {
    collapsible: "icon",
  },

  maxContentWidth: "xl",

  resources: [userResource, organizationResource],

  auth: {
    getCurrentUser,
    signOut,
  },
});
