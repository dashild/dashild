"use client";

import type { FieldRendererProps } from "@dashild/admin";

import { FieldDescription } from "@dashild/admin/ui/field";
import { Input } from "@dashild/admin/ui/input";

/** Custom field registered as `component: "email"`. */
export function EmailField({
  id,
  name,
  value,
  onChange,
  onBlur,
}: FieldRendererProps) {
  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        name={name}
        type="email"
        autoComplete="email"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <FieldDescription>
        A valid email address for this account.
      </FieldDescription>
    </div>
  );
}
