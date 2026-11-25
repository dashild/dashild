/**
 * Table and form actions.
 *
 * The declaration lives in the resource (serializable data). The handler lives
 * in `src/dashild/actions/<model>.ts` on the server and is referenced by name.
 *
 * If a resource does not declare `actions`, the built-in CRUD actions are used.
 * If it does, that is the complete list: omitting `delete` removes the delete
 * button.
 */

import type {
  ActionDefinition,
  CurrentUser,
  ResourceDefinition,
} from "./index.js";
import { translate, type Locale } from "./messages.js";

export type BuiltInActionName =
  | "create"
  | "view"
  | "edit"
  | "delete"
  | "save"
  | "cancel";

const BUILT_IN_NAMES = new Set<string>([
  "create",
  "view",
  "edit",
  "delete",
  "save",
  "cancel",
]);

function builtIns(
  locale: Locale = "en",
): Record<BuiltInActionName, ActionDefinition> {
  return {
    create: {
      name: "create",
      label: translate(locale, "action.create"),
      placement: "header",
    },
    view: { name: "view", label: translate(locale, "action.view") },
    edit: { name: "edit", label: translate(locale, "action.edit") },
    delete: {
      name: "delete",
      label: translate(locale, "action.delete"),
      variant: "destructive",
      confirm: translate(locale, "action.deleteConfirm"),
    },
    save: { name: "save", label: translate(locale, "action.save") },
    cancel: {
      name: "cancel",
      label: translate(locale, "action.cancel"),
      variant: "outline",
    },
  };
}

export function isBuiltInAction(name: string): name is BuiltInActionName {
  return BUILT_IN_NAMES.has(name);
}

/** Completes an action with its built-in label/variant when it is a base name. */
export function mergeActionDefaults(
  action: ActionDefinition,
  locale: Locale = "en",
): ActionDefinition {
  if (!isBuiltInAction(action.name)) return action;
  return { ...builtIns(locale)[action.name], ...action };
}

export function defaultTableActions(
  locale: Locale = "en",
): ActionDefinition[] {
  const actions = builtIns(locale);
  return [actions.create, actions.view, actions.edit, actions.delete].map(
    (action) => ({ ...action }),
  );
}

export function defaultFormActions(
  locale: Locale = "en",
): ActionDefinition[] {
  const actions = builtIns(locale);
  return [{ ...actions.save }, { ...actions.cancel }];
}

export function resolveTableActions(
  resource: ResourceDefinition,
  locale: Locale = "en",
): ActionDefinition[] {
  const actions = resource.table.actions ?? defaultTableActions(locale);
  return actions.map((action) => mergeActionDefaults(action, locale));
}

export function resolveFormActions(
  resource: ResourceDefinition,
  locale: Locale = "en",
): ActionDefinition[] {
  const actions = resource.form.actions ?? defaultFormActions(locale);
  return actions.map((action) => mergeActionDefaults(action, locale));
}

/** Finds a declared action, in table or form, by name. */
export function findAction(
  resource: ResourceDefinition,
  name: string,
  locale: Locale = "en",
): ActionDefinition | undefined {
  return (
    resolveTableActions(resource, locale).find(
      (action) => action.name === name,
    ) ??
    resolveFormActions(resource, locale).find(
      (action) => action.name === name,
    )
  );
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export interface ActionContext<TUser extends CurrentUser = CurrentUser> {
  resource: ResourceDefinition;
  user: TUser;
  /** Row id, for row actions. */
  id?: string;
  /** Form values, for form actions. */
  values?: Record<string, unknown>;
  /** `data` declared on the action. */
  data?: Record<string, unknown>;
  /** Active organization and roles resolved by policies. */
  organizationId?: string | null;
  roles?: string[];
  /** Prisma client extended with the active policy scope, when available. */
  db?: unknown;
}

export interface ActionResult {
  ok: boolean;
  message?: string;
  /** URL to navigate to after the action (downloads, redirects). */
  href?: string;
}

export type ActionHandler<TUser extends CurrentUser = CurrentUser> = (
  context: ActionContext<TUser>,
) => Promise<ActionResult>;
