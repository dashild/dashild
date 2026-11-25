"use client";

import type { CellRendererProps } from "@dashild/admin";

import { Avatar, AvatarFallback } from "@dashild/admin/ui/avatar";

/** Custom cell registered as `cell: "avatar"`. */
export function AvatarCell({ value }: CellRendererProps) {
  const label = String(value ?? "");
  return (
    <span className="flex items-center gap-2">
      <Avatar className="size-6">
        <AvatarFallback className="text-[0.65rem]">
          {label.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span>{label}</span>
    </span>
  );
}
