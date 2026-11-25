"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  translate,
  type ActionDefinition,
  type FieldDefinition,
  type Locale,
  type ResourceDefinition,
} from "@dashild/core";

import { Button } from "../ui/button.js";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../ui/field.js";
import { Input } from "../ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.js";
import { Spinner } from "../ui/spinner.js";
import { Switch } from "../ui/switch.js";
import { Textarea } from "../ui/textarea.js";
import { buildFormSchema } from "../forms/schema.js";
import type { FormOption, RunAction, SaveAction } from "../types.js";

import { useRegistry } from "../registry.js";
import { ActionButton } from "./action-button.js";
import { BytesField } from "./bytes-field.js";
import { RelationMultiSelect } from "./relation-multi-select.js";

interface ResourceFormProps {
  slug: string;
  path: string;
  resource: ResourceDefinition;
  id?: string;
  values?: Record<string, unknown> | null;
  options: Record<string, FormOption[]>;
  actions: ActionDefinition[];
  saveAction: SaveAction;
  runAction: RunAction;
  locale?: Locale;
  /** Custom actions the server allowed for this user. */
  allowedActions?: string[];
}

type FormValues = Record<string, unknown>;

function formValue(field: FieldDefinition, value: unknown): unknown {
  if (field.type === "boolean") {
    return Boolean(value ?? field.default ?? false);
  }

  if (field.type === "relation" && field.multiple) {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) =>
        entry && typeof entry === "object" && "id" in entry
          ? String((entry as { id: unknown }).id ?? "")
          : String(entry),
      )
      .filter(Boolean);
  }

  if (field.type === "relation") {
    if (value && typeof value === "object" && "id" in value) {
      return String((value as { id: unknown }).id ?? "");
    }
    return value == null ? "" : String(value);
  }

  if (field.type === "json") {
    if (value == null || value === "") return "";
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  }

  if (field.type === "datetime" && typeof value === "string") {
    return value.slice(0, 16);
  }

  if (field.type === "date" && typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value == null) {
    return field.default == null ? "" : String(field.default);
  }

  return String(value);
}

export function ResourceForm({
  slug,
  path,
  resource,
  id,
  values,
  options,
  actions,
  saveAction,
  runAction,
  locale,
  allowedActions,
}: ResourceFormProps) {
  const registry = useRegistry();
  const schema = useMemo(() => buildFormSchema(resource), [resource]);

  const defaultValues = useMemo(() => {
    const result: FormValues = {};
    for (const field of resource.form.fields) {
      result[field.field] = formValue(field, values?.[field.field]);
    }
    return result;
  }, [resource, values]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues,
  });

  const onSubmit = form.handleSubmit(async (data) => {
    const result = await saveAction({ slug, id, values: data });

    if (result.ok) return;

    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      form.setError(field, { message: messages[0] });
    }
    if (result.message) form.setError("root", { message: result.message });
  });

  const rootError = form.formState.errors.root?.message;

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6">
      <FieldGroup>
        {resource.form.fields.map((field) => (
          <Controller
            key={field.field}
            control={form.control}
            name={field.field}
            render={({ field: control, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.field}>
                  {field.label ?? field.field}
                </FieldLabel>
                {field.component && registry.fields[field.component] ? (
                  (() => {
                    const Custom = registry.fields[field.component]!;
                    return (
                      <Custom
                        field={field}
                        value={control.value}
                        onChange={control.onChange}
                        onBlur={control.onBlur}
                        id={field.field}
                        name={field.field}
                        options={options[field.field] ?? []}
                        locale={locale}
                      />
                    );
                  })()
                ) : (
                  renderControl(
                    field,
                    control,
                    options[field.field] ?? [],
                    locale,
                  )
                )}
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        ))}

        {rootError ? (
          <p role="alert" className="text-sm text-destructive">
            {rootError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => {
            if (action.name === "save") {
              return (
                <Button
                  key={action.name}
                  type="submit"
                  variant={action.variant ?? "default"}
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  {form.formState.isSubmitting
                    ? translate(locale, "shell.saving")
                    : (action.label ?? translate(locale, "action.save"))}
                </Button>
              );
            }

            if (action.name === "cancel") {
              return (
                <Button
                  key={action.name}
                  asChild
                  variant={action.variant ?? "outline"}
                >
                  <Link href={`${path}/${slug}`}>
                    {action.label ?? translate(locale, "action.cancel")}
                  </Link>
                </Button>
              );
            }

            if (allowedActions && !allowedActions.includes(action.name)) {
              return null;
            }

            return (
              <ActionButton
                key={action.name}
                action={action}
                slug={slug}
                id={id}
                getValues={() => form.getValues()}
                runAction={runAction}
                locale={locale}
              />
            );
          })}
        </div>
      </FieldGroup>
    </form>
  );
}

function renderControl(
  field: FieldDefinition,
  control: {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    ref: (instance: unknown) => void;
    name: string;
  },
  options: FormOption[],
  locale?: Locale,
) {
  const id = field.field;

  switch (field.type) {
    case "boolean":
      return (
        <Switch
          id={id}
          checked={Boolean(control.value)}
          onCheckedChange={control.onChange}
        />
      );

    case "relation":
      if (field.multiple) {
        return (
          <RelationMultiSelect
            id={id}
            value={Array.isArray(control.value) ? control.value : []}
            onChange={control.onChange}
            options={options}
            locale={locale}
          />
        );
      }
      // Single relation uses the same select control.
      // falls through
    case "select": {
      const none = "__none__";
      return (
        <Select
          value={
            typeof control.value === "string" && control.value !== ""
              ? control.value
              : undefined
          }
          onValueChange={(value) =>
            control.onChange(value === none ? "" : value)
          }
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={translate(locale, "shell.selectOption")} />
          </SelectTrigger>
          <SelectContent>
            {field.rules?.required ? null : (
              <SelectItem value={none}>{translate(locale, "shell.noValue")}</SelectItem>
            )}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case "textarea":
      return (
        <Textarea
          id={id}
          value={typeof control.value === "string" ? control.value : ""}
          onChange={(event) => control.onChange(event.target.value)}
          onBlur={control.onBlur}
          rows={4}
        />
      );

    case "bytes":
      return (
        <BytesField
          id={id}
          value={control.value}
          onChange={control.onChange}
          onBlur={control.onBlur}
          locale={locale}
        />
      );

    case "json":
      return (
        <Textarea
          id={id}
          value={typeof control.value === "string" ? control.value : ""}
          onChange={(event) => control.onChange(event.target.value)}
          onBlur={control.onBlur}
          rows={6}
          className="font-mono text-xs"
        />
      );

    case "date":
    case "datetime":
      return (
        <Input
          id={id}
          type={field.type === "date" ? "date" : "datetime-local"}
          value={typeof control.value === "string" ? control.value : ""}
          onChange={(event) => control.onChange(event.target.value)}
          onBlur={control.onBlur}
        />
      );

    case "number":
      return (
        <Input
          id={id}
          type="number"
          step="any"
          value={typeof control.value === "string" ? control.value : ""}
          onChange={(event) => control.onChange(event.target.value)}
          onBlur={control.onBlur}
        />
      );

    case "email":
    case "password":
      return (
        <Input
          id={id}
          type={field.type}
          value={typeof control.value === "string" ? control.value : ""}
          onChange={(event) => control.onChange(event.target.value)}
          onBlur={control.onBlur}
        />
      );

    default:
      return (
        <Input
          id={id}
          type="text"
          value={typeof control.value === "string" ? control.value : ""}
          onChange={(event) => control.onChange(event.target.value)}
          onBlur={control.onBlur}
        />
      );
  }
}
