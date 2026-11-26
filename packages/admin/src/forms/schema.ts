import { z } from "zod";

import type { FieldDefinition, Locale, ResourceDefinition } from "@dashild/core";

const MESSAGES = {
  en: {
    number: "Invalid number.",
    email: "Invalid email.",
    json: "Invalid JSON.",
    min: (count: number) => `At least ${count} characters.`,
    max: (count: number) => `At most ${count} characters.`,
    pattern: "Invalid format.",
    required: "This field is required.",
  },
  es: {
    number: "Número no válido.",
    email: "Email no válido.",
    json: "JSON no válido.",
    min: (count: number) => `Mínimo ${count} caracteres.`,
    max: (count: number) => `Máximo ${count} caracteres.`,
    pattern: "Formato no válido.",
    required: "Este campo es obligatorio.",
  },
} as const;

/**
 * Esquema de cliente.
 *
 * Solo valida mientras el usuario escribe; la autoridad es el servidor, que
 * importa los metadatos y las mismas reglas. Aquí no hay nada que el cliente
 * pueda “saltarse” para escribir datos inválidos.
 */
export function buildFormSchema(
  resource: ResourceDefinition,
  locale: Locale = "en",
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of resource.form.fields) {
    shape[field.field] = buildFieldSchema(field, locale);
  }

  return z.object(shape);
}

function buildFieldSchema(
  field: FieldDefinition,
  locale: Locale,
): z.ZodTypeAny {
  const messages = MESSAGES[locale];
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "number":
      schema = z
        .string()
        .refine(
          (value) => value === "" || !Number.isNaN(Number(value)),
          messages.number,
        );
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "email":
      schema = z.string().email(messages.email);
      break;
    case "relation":
      schema = field.multiple ? z.array(z.string()) : z.string();
      break;
    case "bytes":
      schema = z.string();
      break;
    case "json":
      schema = z.string().refine((value) => {
        if (value.trim() === "") return true;
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      }, messages.json);
      break;
    default:
      schema = z.string();
  }

  if (field.rules?.min !== undefined || field.rules?.max !== undefined) {
    if (schema instanceof z.ZodString) {
      let stringSchema = schema;
      if (field.rules.min !== undefined) {
        stringSchema = stringSchema.min(
          field.rules.min,
          messages.min(field.rules.min),
        );
      }
      if (field.rules.max !== undefined) {
        stringSchema = stringSchema.max(
          field.rules.max,
          messages.max(field.rules.max),
        );
      }
      schema = stringSchema;
    }
  }

  if (field.rules?.pattern && schema instanceof z.ZodString) {
    schema = schema.regex(new RegExp(field.rules.pattern), messages.pattern);
  }

  if (field.rules?.required) {
    if (schema instanceof z.ZodString) {
      return schema.min(1, messages.required);
    }
    return schema;
  }

  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );
}
