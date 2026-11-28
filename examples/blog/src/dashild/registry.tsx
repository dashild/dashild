"use client";

// dashild:generated 0.1.0-alpha.12

import { RegistryProvider } from "@dashild/admin";

/**
 * App registry for custom cells and fields.
 *
 * Register components with registerCell/registerField from @dashild/core:
 *
 *   registerCell("avatar", AvatarCell);
 *   registerField("color", ColorField);
 *
 * The provider is a client component because the renderers are functions.
 */
export function AppRegistryProvider({ children }: { children: React.ReactNode }) {
  return <RegistryProvider>{children}</RegistryProvider>;
}
