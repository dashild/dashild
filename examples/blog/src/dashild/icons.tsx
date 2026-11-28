"use client";

// dashild:generated 0.1.0-alpha.12

import type { ElementType } from "react";

import { IconProvider } from "@dashild/admin";

/**
 * App icon registry.
 *
 * Add any React icon component here under the name used by
 * `navigation.icon` or `action.icon`.
 */
export const icons: Record<string, ElementType> = {};

export function AppIconProvider({ children }: { children: React.ReactNode }) {
  return <IconProvider icons={icons}>{children}</IconProvider>;
}
