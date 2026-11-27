"use client";

import {
  registerCell,
  registeredCells,
  registeredFields,
} from "@dashild/core";
import { RegistryProvider, type Registry } from "@dashild/admin";

import { SpeciesCell } from "../components/dashild/species-cell";

registerCell("species", SpeciesCell);

export function AppRegistryProvider({ children }: { children: React.ReactNode }) {
  return (
    <RegistryProvider
      cells={registeredCells() as Registry["cells"]}
      fields={registeredFields() as Registry["fields"]}
    >
      {children}
    </RegistryProvider>
  );
}
