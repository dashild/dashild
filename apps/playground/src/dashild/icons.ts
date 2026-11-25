import type { ElementType } from "react";

import { Rocket } from "lucide-react";

/**
 * Iconos propios del panel.
 *
 * La clave es el nombre que usas en `navigation.icon`; el valor, **cualquier
 * componente de icono de React**. No está atado a lucide: Tabler, Phosphor,
 * Heroicons o Radix Icons funcionan igual.
 *
 * ```ts
 * // lucide
 * import { Rocket } from "lucide-react";
 * // tabler
 * import { IconRocket } from "@tabler/icons-react";
 *
 * export const icons = { rocket: IconRocket };
 * ```
 *
 * El mapa base del shell es lucide (`@dashild/admin`); este archivo lo
 * sobrescribe por nombre. Para cambiar el set completo, se sobrescriben aquí
 * todas las claves.
 *
 * Este archivo es de la app, como `panel.ts`: no se genera, no se sobrescribe y
 * no necesita un comando. Lo consume el `IconProvider` cliente, porque los
 * iconos son funciones y no se pueden pasar desde el servidor como props.
 */
export const icons: Record<string, ElementType> = {
  rocket: Rocket,
};
