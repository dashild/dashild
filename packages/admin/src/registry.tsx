"use client";

import {
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";

import type {
  ColumnDefinition,
  FieldDefinition,
  Locale,
} from "@dashild/core";

import type { FormOption } from "./types.js";

export interface CellRendererProps {
  value: unknown;
  row: Record<string, unknown>;
  column: ColumnDefinition;
  locale?: Locale;
}

export interface FieldRendererProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  id: string;
  name: string;
  options: FormOption[];
  locale?: Locale;
}

export interface Registry {
  cells: Record<string, ComponentType<CellRendererProps>>;
  fields: Record<string, ComponentType<FieldRendererProps>>;
}

const EMPTY: Registry = { cells: {}, fields: {} };
const RegistryContext = createContext<Registry>(EMPTY);

/**
 * App registry for custom cells and fields.
 *
 * The app mounts this provider in a client module (usually
 * `src/dashild/registry.tsx`). Components are functions, so they cannot travel
 * from the server page as props; context keeps them on the client.
 */
export function RegistryProvider({
  cells,
  fields,
  children,
}: {
  cells?: Registry["cells"];
  fields?: Registry["fields"];
  children: ReactNode;
}) {
  return (
    <RegistryContext.Provider
      value={{ cells: cells ?? {}, fields: fields ?? {} }}
    >
      {children}
    </RegistryContext.Provider>
  );
}

export function useRegistry(): Registry {
  return useContext(RegistryContext);
}
