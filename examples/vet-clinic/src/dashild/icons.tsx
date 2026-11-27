"use client";

import type { ElementType } from "react";

import { IconProvider } from "@dashild/admin";
import { Shield } from "lucide-react";

/**
 * App icon registry.
 *
 * Add any React icon component here under the name used by
 * `navigation.icon` or `action.icon`.
 */
export const icons: Record<string, ElementType> = {
  shield: Shield,
};

export function AppIconProvider({ children }: { children: React.ReactNode }) {
  return <IconProvider icons={icons}>{children}</IconProvider>;
}
