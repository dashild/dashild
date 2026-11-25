"use client";

import type { Locale } from "@dashild/core";

import type { FormOption } from "../types.js";

/**
 * Checkbox list for o2m/m2m relations.
 *
 * A native multiple select is inconsistent across browsers; a scrollable
 * checkbox list stays usable and keeps the value as a string array.
 */
export function RelationMultiSelect({
  id,
  value,
  onChange,
  options,
  locale,
}: {
  id: string;
  value: unknown[];
  onChange: (value: string[]) => void;
  options: FormOption[];
  locale?: Locale;
}) {
  const selected = new Set(value.map(String));

  return (
    <div
      id={id}
      role="group"
      aria-label={locale === "es" ? "Selección múltiple" : "Multiple selection"}
      className="max-h-48 overflow-auto rounded-lg border border-input p-2"
    >
      {options.length === 0 ? (
        <p className="px-1 py-2 text-sm text-muted-foreground">
          {locale === "es" ? "Sin opciones disponibles." : "No options available."}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {options.map((option) => {
            const checked = selected.has(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={checked}
                  onChange={(event) => {
                    const next = new Set(selected);
                    if (event.target.checked) next.add(option.value);
                    else next.delete(option.value);
                    onChange([...next]);
                  }}
                />
                <span className="truncate">{option.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
