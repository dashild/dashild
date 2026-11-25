"use client";

import {
  registerCell,
  registerField,
  registeredCells,
  registeredFields,
} from "@dashild/core";
import { RegistryProvider, type Registry } from "@dashild/admin";

import { AvatarCell } from "@/components/dashild/cells/avatar-cell";
import { EmailField } from "@/components/dashild/fields/email-field";

registerCell("avatar", AvatarCell);
registerField("email", EmailField);

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
