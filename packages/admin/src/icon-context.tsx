"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { IconMap } from "./components/icon-map.js";

/**
 * Client-side icon registry.
 *
 * React components are functions, so they cannot cross the server/client
 * boundary as props. The app mounts a client `IconProvider` that imports its
 * own `src/dashild/icons.ts`; every client component below reads the map from
 * context.
 */
const IconContext = createContext<IconMap>({});

export function IconProvider({
  icons,
  children,
}: {
  icons?: IconMap;
  children: ReactNode;
}) {
  return <IconContext.Provider value={icons ?? {}}>{children}</IconContext.Provider>;
}

export function useIcons(): IconMap {
  return useContext(IconContext);
}
