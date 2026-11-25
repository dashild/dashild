import { z } from "zod";

import type { FieldDefinition, ResourceDefinition } from "@dashild/core";

/**
 * Esquema de cliente.
 *
 * Solo valida mientras el usuario escribe; la autoridad es el servidor, que
 * importa los metadatos y las mismas reglas. Aquí no hay nada que el cliente
 * pueda “saltarse” para escribir datos inválidos.
 */
export function buildFormSchema(
  resource: ResourceDefinition,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of resource.form.fields) {
    shape[field.field] = buildFieldSchema(field);
  }

  return z.object(shape);
}

function buildFieldSchema(field: FieldDefinition): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "number":
      schema = z
        .string()
        .refine(
          (value) => value === "" || !Number.isNaN(Number(value)),
          "Número no válido.",
        );
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "email":
      schema = z.string().email("Email no válido.");
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
      }, "JSON no válido.");
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
          `Mínimo ${field.rules.min} caracteres.`,
        );
      }
      if (field.rules.max !== undefined) {
        stringSchema = stringSchema.max(
          field.rules.max,
          `Máximo ${field.rules.max} caracteres.`,
        );
      }
      schema = stringSchema;
    }
  }

  if (field.rules?.pattern && schema instanceof z.ZodString) {
    schema = schema.regex(
      new RegExp(field.rules.pattern),
      "Formato no válido.",
    );
  }

  if (field.rules?.required) {
    if (schema instanceof z.ZodString) {
      return schema.min(1, "Este campo es obligatorio.");
    }
    return schema;
  }

  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );
}
