/**
 * @dashild/core — public declarations.
 *
 * Everything in this file is a DATA DOCUMENT: it is imported on the server
 * (validation, whitelist, query building) and its result is passed to the
 * client as a serializable prop. That is why nothing here may contain closures.
 *
 * Types are intentionally minimal: the spike (blocks 2 and 3) closes them.
 */

import type { Locale } from "./messages.js";

import type { FieldFormat, FieldType } from "./mapping.js";

export interface NavigationDefinition {
  label: string;
  /** Segmento de URL del recurso. `make:resource` lo deriva del modelo. */
  slug: string;
  /**
   * Icon name. The shell resolves a base list (`users`, `building`,
   * `file-text`, `settings`, `database`, `folder`, `chart`, `package`,
   * `shopping-cart`, `tag`, `calendar`, `mail`, `briefcase`, `credit-card`,
   * `truck`, `layers`) and the app can add its own in
   * `src/dashild/icons.ts`. An unknown name falls back to the generic icon
   * en desarrollo.
   */
  icon?: string;
  group?: string;
}

export interface PolicyReference {
  /**
   * Intent declaration. The resource must have a matching policy in
   * `policies.ts`; without it, the runtime fails closed.
   */
  scope: string;
}

export interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  /** Pattern as a string: the resource is data and cannot hold a RegExp. */
  pattern?: string;
}

export interface ColumnDefinition {
  field: string;
  label?: string;
  sortable?: boolean;
  format?: FieldFormat;
  /** Nombre registrado con `registerCell`. */
  cell?: string;
  /** When `field` is a relation, the related model field to display. */
  display?: string;
  /** Mapa valor -> tono, para celdas de tipo badge. */
  tone?: Record<string, string>;
}

export interface FilterDefinition {
  field: string;
  type: "boolean" | "enum" | "relation" | "text" | "number" | "date";
  label?: string;
  /** Campo del modelo relacionado que se usa como etiqueta legible. */
  display?: string;
}

export interface FieldDefinition {
  field: string;
  type: FieldType;
  label?: string;
  /** Prisma relation name when `type` is "relation". */
  relation?: string;
  display?: string;
  default?: unknown;
  rules?: ValidationRules;
}

export type ActionPlacement = "header" | "row";

export type ActionVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost";

export interface ActionDefinition {
  /**
   * Handler name in `src/dashild/actions/<model>.ts`. Built-in names
   * (`create`, `view`, `edit`, `delete`, `save`, `cancel`) are resolved by
   * the shell, not by a handler.
   */
  name: string;
  label?: string;
  /** Nombre de icono del mapa compartido. */
  icon?: string;
  /** Table: header or row menu. Defaults to row. */
  placement?: ActionPlacement;
  /** Ask for confirmation; a string is the dialog text. */
  confirm?: boolean | string;
  variant?: ActionVariant;
  /** Permiso que exige; se resuelve en policies.ts (Bloque 4). */
  requires?: string;
  /** Link action: it does not need a handler. Supports `{id}`. */
  href?: string;
  /** Datos extra que recibe el handler. */
  data?: Record<string, unknown>;
}

export interface TableDefinition {
  searchable?: string[];
  columns: ColumnDefinition[];
  filters?: FilterDefinition[];
  actions?: ActionDefinition[];
  pageSize?: number;
}

export interface FormDefinition {
  fields: FieldDefinition[];
  actions?: ActionDefinition[];
}

export interface ResourceDefinition {
  model: string;
  navigation: NavigationDefinition;
  policy?: PolicyReference;
  table: TableDefinition;
  form: FormDefinition;
  actions?: ActionDefinition[];
}

/**
 * Declares a resource. Identity function: no runtime behind it, only types.
 * types. The returned object is serializable and is passed to the client as a prop.
 *
 * It returns `ResourceDefinition` on purpose, not the literal: a `const` generic
 * turns `columns` into a union where `sortable` does not exist on every
 * variant, and the runtime would have to cast on every access.
 */
export function defineResource(definition: ResourceDefinition): ResourceDefinition {
  return definition;
}

export interface CurrentUser {
  id: string;
  email?: string;
  name?: string;
}

/** Nombre de una paleta de Tailwind que el panel puede usar como primario. */
export type PanelColor =
  | "amber"
  | "blue"
  | "cyan"
  | "emerald"
  | "fuchsia"
  | "gray"
  | "green"
  | "indigo"
  | "lime"
  | "neutral"
  | "orange"
  | "pink"
  | "red"
  | "rose"
  | "sky"
  | "slate"
  | "stone"
  | "teal"
  | "violet"
  | "yellow"
  | "zinc";

export interface PanelBrand {
  name?: string;
  /** Ruta o URL del logo. Si falta, se usa la inicial del nombre. */
  logo?: string;
}

export interface PanelTheme {
  /** Modo inicial. El usuario puede cambiarlo si `toggle` es true. */
  defaultMode?: "light" | "dark";
  /** Show the light/dark toggle in the header. */
  toggle?: boolean;
  /** Paleta primaria de shadcn. */
  primary?: PanelColor;
}

export interface PanelSidebar {
  /** `icon` colapsa a iconos; `offcanvas` se oculta; `none` queda fijo. */
  collapsible?: "icon" | "offcanvas" | "none";
}

export interface PanelAuth<TUser extends CurrentUser = CurrentUser> {
  getCurrentUser: () => Promise<TUser | null>;
  /** Server action to sign out. If missing, the menu is not shown. */
  signOut?: () => Promise<void>;
}

export interface PanelDefinition<TUser extends CurrentUser = CurrentUser> {
  title: string;
  /** UI language for built-in labels and validation messages. Defaults to `en`. */
  locale?: Locale;
  /** Prefijo de URL del panel, sin barra final. Ej: "/admin". */
  path: string;
  /**
   * Domain the panel belongs to. Next routes by host, so Dashild uses it to
   * generate absolute URLs and for documentation.
   */
  domain?: string;
  brand?: PanelBrand;
  theme?: PanelTheme;
  sidebar?: PanelSidebar;
  /** Maximum content width, like Filament. */
  maxContentWidth?: "sm" | "md" | "lg" | "xl" | "full";
  resources: ResourceDefinition[];
  auth: PanelAuth<TUser>;
}

/** Declares the panel. `auth.getCurrentUser` is the only executable part of the config. */
export function definePanel<TUser extends CurrentUser>(
  definition: PanelDefinition<TUser>,
): PanelDefinition<TUser> {
  return definition;
}

export interface PolicyContext<TUser extends CurrentUser = CurrentUser> {
  user: TUser;
  organizationId: string | null;
  roles: string[];
}

export type PolicyPredicate<TUser extends CurrentUser = CurrentUser> = (
  ctx: PolicyContext<TUser>,
  values?: Record<string, unknown>,
) => boolean | Promise<boolean>;

export interface ResourcePolicy<TUser extends CurrentUser = CurrentUser> {
  /**
   * Prisma `where` fragment applied to every read and write. Returning `null`
   * denies the whole resource.
   */
  scope?: (ctx: PolicyContext<TUser>) => Record<string, unknown> | null;
  can?: Record<string, PolicyPredicate<TUser>>;
}

export interface PoliciesDefinition<TUser extends CurrentUser = CurrentUser> {
  organizationOf?: (user: TUser) => Promise<string | null>;
  rolesOf?: (user: TUser) => Promise<string[]>;
  resources: Record<string, ResourcePolicy<TUser>>;
}

/** Declares server policies. This module is never imported on the client. */
export function definePolicies<TUser extends CurrentUser = CurrentUser>(
  definition: PoliciesDefinition<TUser>,
): PoliciesDefinition<TUser> {
  return definition;
}

/**
 * TODO(spike bloque 3): tipar contra `React.ComponentType`.
 * core cannot depend on @types/react because the server imports it too.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentRenderer = (props: any) => unknown;

const cells = new Map<string, ComponentRenderer>();
const fields = new Map<string, ComponentRenderer>();

/** Registra una celda de tabla propia. Usar desde `registry.tsx`. */
export function registerCell(name: string, renderer: ComponentRenderer): void {
  cells.set(name, renderer);
}

/** Registra un campo de formulario propio. Usar desde `registry.tsx`. */
export function registerField(name: string, renderer: ComponentRenderer): void {
  fields.set(name, renderer);
}

// ---------------------------------------------------------------------------
// Metadata contract and mapping table
// ---------------------------------------------------------------------------

/**
 * Metadata types and the mapping table are exported here so generator,
 * runtime and CLI share a single definition. See `metadata.ts` and
 * `mapping.ts`.
 */
export * from "./messages.js";
export * from "./metadata.js";
export * from "./mapping.js";
export * from "./actions.js";

