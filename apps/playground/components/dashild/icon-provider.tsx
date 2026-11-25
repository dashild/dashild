"use client";

import { IconProvider } from "@dashild/admin";

import { icons } from "@/src/dashild/icons";

/**
 * App icon registry.
 *
 * This module is a client component on purpose: it imports the app's own icon
 * map in the browser bundle. Icons are React components, so they cannot be
 * serialized from the server page as props.
 */
export function AppIconProvider({ children }: { children: React.ReactNode }) {
  return <IconProvider icons={icons}>{children}</IconProvider>;
}
