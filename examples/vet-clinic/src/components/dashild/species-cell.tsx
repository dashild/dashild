"use client";

import type { CellRendererProps } from "@dashild/admin";

const SPECIES: Record<string, { label: string; emoji: string }> = {
  DOG: { label: "Dog", emoji: "🐶" },
  CAT: { label: "Cat", emoji: "🐱" },
  RABBIT: { label: "Rabbit", emoji: "🐰" },
  BIRD: { label: "Bird", emoji: "🐦" },
  OTHER: { label: "Other", emoji: "🐾" },
};

/** Custom cell: species with an emoji instead of the raw enum value. */
export function SpeciesCell({ value }: CellRendererProps) {
  const species = SPECIES[String(value)] ?? {
    label: String(value ?? ""),
    emoji: "🐾",
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true">{species.emoji}</span>
      {species.label}
    </span>
  );
}
