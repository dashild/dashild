/**
 * @dashild/core/server — runtime de lectura y escritura.
 *
 * Everything here is a pure function over data: it receives the resource (data
 * metadata and input values, and returns a
 * query, a DTO or data ready for Prisma. It imports no Prisma or React, so it
 * so it can be tested without a database or a browser.
 *
 * The rule governing this file: **the client does not build `where` or
 * `orderBy`**. It only sends names and values the resource already declared;
 * everything else is discarded.
 */

import { z } from "zod";

import {
  findAction,
  type ActionHandler,
} from "./actions.js";
import {
  mappingContext,
  resolveFieldMapping,
  type MappingContext,
} from "./mapping.js";
import type {
  DashildMetadata,
  FieldMetadata,
  ModelMetadata,
} from "./metadata.js";
import { translate, type Locale } from "./messages.js";
import type {
  ActionDefinition,
  ColumnDefinition,
  CurrentUser,
  FieldDefinition,
  FilterDefinition,
  PoliciesDefinition,
  PolicyContext,
  PolicyPredicate,
  ResourceDefinition,
} from "./index.js";

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;

export type RawListParams = Record<
  string,
  string | string[] | undefined
>;

export interface NormalizedFilter {
  field: string;
  type: FilterDefinition["type"];
  value: string;
}

export interface NormalizedListParams {
  page: number;
  perPage: number;
  sort: string | null;
  direction: "asc" | "desc";
  search: string | null;
  filters: NormalizedFilter[];
}

export interface ListQuery {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  skip: number;
  take: number;
  include?: Record<string, unknown>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toPositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Normalizes URL parameters against what the resource declares.
 *
 * Nothing undeclared survives: not a sort field, not a filter, not a page
 * size above the maximum.
 */
export function normalizeListParams(
  resource: ResourceDefinition,
  raw: RawListParams,
): NormalizedListParams {
  const page = toPositiveInt(first(raw.page)) ?? 1;

  const requestedPerPage = toPositiveInt(first(raw.perPage));
  const perPage = Math.min(
    Math.max(requestedPerPage ?? resource.table.pageSize ?? DEFAULT_PER_PAGE, 1),
    MAX_PER_PAGE,
  );

  const requestedSort = first(raw.sort);
  const sortColumn = requestedSort
    ? resource.table.columns.find(
        (column) => column.field === requestedSort && column.sortable,
      )
    : undefined;

  const direction: "asc" | "desc" =
    first(raw.dir) === "asc" ? "asc" : "desc";

  const search = first(raw.q)?.trim() || null;

  const filters: NormalizedFilter[] = [];
  for (const filter of resource.table.filters ?? []) {
    const value = first(raw[filter.field])?.trim();
    if (value) {
      filters.push({ field: filter.field, type: filter.type, value });
    }
  }

  return {
    page,
    perPage,
    sort: sortColumn?.field ?? null,
    direction,
    search,
    filters,
  };
}

/**
 * Builds the list query.
 *
 * `include` comes from relation columns, not from the client. `orderBy` can
 * only target a `sortable` column. `where` only contains search on
 * campos `searchable` y filtros declarados.
 */
export function buildListQuery(
  resource: ResourceDefinition,
  model: ModelMetadata,
  params: NormalizedListParams,
): ListQuery {
  const fields = new Map(model.fields.map((field) => [field.name, field]));
  const where: Record<string, unknown> = {};

  if (params.search) {
    const searchable = (resource.table.searchable ?? []).filter((name) => {
      const field = fields.get(name);
      return field?.kind === "scalar" && field.type === "String";
    });

    if (searchable.length > 0) {
      where.OR = searchable.map((name) => ({
        [name]: { contains: params.search, mode: "insensitive" },
      }));
    }
  }

  for (const filter of params.filters) {
    const field = fields.get(filter.field);
    if (!field) continue;

    const value = coerceFilterValue(filter);
    if (value === undefined) continue;

    if (field.kind === "object") {
      // m2o: the filter arrives as an id and Prisma expects a relation condition.
      // o2m/m2m no se filtran en v1.
      if (!field.isList) where[filter.field] = { id: value };
      continue;
    }

    where[filter.field] = value;
  }

  let orderBy: Record<string, unknown> | undefined;
  if (params.sort) {
    const field = fields.get(params.sort);
    if (field?.kind === "object") {
      const column = resource.table.columns.find(
        (entry) => entry.field === params.sort,
      );
      orderBy = {
        [params.sort]: { [column?.display ?? "id"]: params.direction },
      };
    } else {
      orderBy = { [params.sort]: params.direction };
    }
  }

  const include = buildInclude(resource, fields);

  return {
    where,
    ...(orderBy ? { orderBy } : {}),
    skip: (params.page - 1) * params.perPage,
    take: params.perPage,
    ...(include ? { include } : {}),
  };
}

function coerceFilterValue(filter: NormalizedFilter): unknown {
  switch (filter.type) {
    case "boolean":
      if (filter.value === "true") return true;
      if (filter.value === "false") return false;
      return undefined;
    case "number": {
      const parsed = Number(filter.value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    case "date": {
      const parsed = new Date(filter.value);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    default:
      return filter.value;
  }
}

function buildInclude(
  resource: ResourceDefinition,
  fields: ReadonlyMap<string, FieldMetadata>,
): Record<string, unknown> | undefined {
  const include: Record<string, unknown> = {};

  for (const column of resource.table.columns) {
    const field = fields.get(column.field);
    if (field?.kind !== "object" || field.isList) continue;

    const display = column.display;
    include[column.field] = {
      select:
        display && display !== "id"
          ? { id: true, [display]: true }
          : { id: true },
    };
  }

  return Object.keys(include).length > 0 ? include : undefined;
}

/**
 * Converts a Prisma row into a JSON-safe object.
 *
 * Applies the mapping table's `dto` to each scalar and flattens relations to
 * `{ id, display }`, the only thing the table needs.
 */
export function toDTO(
  row: Record<string, unknown>,
  model: ModelMetadata,
  resource: ResourceDefinition,
  context: MappingContext,
): Record<string, unknown> {
  const fields = new Map(model.fields.map((field) => [field.name, field]));
  const displays = new Map(
    resource.table.columns
      .filter((column) => column.display)
      .map((column) => [column.field, column.display as string]),
  );

  const dto: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const field = fields.get(key);

    if (!field) {
      dto[key] = toJSONScalar(value);
      continue;
    }

    if (field.kind === "object") {
      dto[key] = toRelationDTO(value, displays.get(key));
      continue;
    }

    dto[key] = resolveFieldMapping(field, context).dto(value);
  }

  return dto;
}

function toRelationDTO(
  value: unknown,
  display: string | undefined,
): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return value;

  const record = value as Record<string, unknown>;
  return {
    id: toJSONScalar(record.id),
    display: display ? toJSONScalar(record[display]) : null,
  };
}

function toJSONScalar(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "toJSON" in value) {
    const json = (value as { toJSON: () => unknown }).toJSON();
    return typeof json === "string" ? json : json;
  }
  return value;
}

/** Builds the enum context once per request. */
export function listContext(
  metadata: DashildMetadata,
  locale: Locale = "en",
): MappingContext {
  return mappingContext(metadata, locale);
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

export type WriteOperation = "create" | "update";

export interface WriteFieldErrors {
  [field: string]: string[];
}

export type WriteParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; fieldErrors: WriteFieldErrors };

export interface WriteError {
  fieldErrors: WriteFieldErrors;
  message?: string;
}

function formDefinition(
  resource: ResourceDefinition,
  field: string,
): FieldDefinition | undefined {
  return resource.form.fields.find((entry) => entry.field === field);
}

function isRequired(
  field: FieldMetadata,
  definition: FieldDefinition,
): boolean {
  if (definition.rules?.required !== undefined) {
    return definition.rules.required;
  }
  return field.isRequired && !field.hasDefaultValue;
}

/**
 * Applies the resource rules to the type schema.
 *
 * The resource is the only source of business rules; metadata provides the
 * type and structural required-ness.
 */
function applyRules(
  schema: z.ZodTypeAny,
  definition: FieldDefinition,
  locale: Locale,
): z.ZodTypeAny {
  let result = schema;
  const { rules } = definition;

  if (definition.type === "email" && result instanceof z.ZodString) {
    result = result.email(translate(locale, "validation.email"));
  }

  if (rules?.min !== undefined || rules?.max !== undefined) {
    if (result instanceof z.ZodString) {
      let stringSchema = result;
      if (rules.min !== undefined) {
        stringSchema = stringSchema.min(
          rules.min,
          translate(locale, "validation.minLength", { min: rules.min }),
        );
      }
      if (rules.max !== undefined) {
        stringSchema = stringSchema.max(
          rules.max,
          translate(locale, "validation.maxLength", { max: rules.max }),
        );
      }
      result = stringSchema;
    } else if (result instanceof z.ZodNumber) {
      let numberSchema = result;
      if (rules.min !== undefined) {
        numberSchema = numberSchema.min(
          rules.min,
          translate(locale, "validation.min", { min: rules.min }),
        );
      }
      if (rules.max !== undefined) {
        numberSchema = numberSchema.max(
          rules.max,
          translate(locale, "validation.max", { max: rules.max }),
        );
      }
      result = numberSchema;
    }
  }

  if (rules?.pattern && result instanceof z.ZodString) {
    result = result.regex(
      new RegExp(rules.pattern),
      translate(locale, "validation.pattern"),
    );
  }

  // The form sends JSON as text; the server parses it before validating.
  if (definition.type === "json") {
    result = z.preprocess((value) => {
      if (typeof value !== "string" || value.trim() === "") return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }, result);
  }

  return result;
}

function applyPresence(
  schema: z.ZodTypeAny,
  field: FieldMetadata,
  definition: FieldDefinition,
  operation: WriteOperation,
  locale: Locale,
): z.ZodTypeAny {
  if (operation === "update") return schema.optional();

  if (isRequired(field, definition)) {
    if (field.type === "String" && schema instanceof z.ZodString) {
      return schema.min(1, translate(locale, "validation.required"));
    }
    if (field.kind === "object") {
      return schema.refine(
        (value) => value !== "" && value !== null && value !== undefined,
        translate(locale, "validation.select"),
      );
    }
    return schema;
  }

  // An empty optional field arrives as "" from a form; the database decides
  // whether it is stored as null.
  return z.preprocess(
    (value) => (value === "" ? null : value),
    schema.nullish(),
  );
}

/**
 * Esquema autoritativo de escritura.
 *
 * It only includes fields declared in `form.fields` and editable per the
 * mapping table. A field not in the resource cannot be written, even if it
 * in the model.
 */
export function buildWriteSchema(
  resource: ResourceDefinition,
  model: ModelMetadata,
  context: MappingContext,
  operation: WriteOperation,
): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of model.fields) {
    const definition = formDefinition(resource, field.name);
    if (!definition) continue;

    const mapping = resolveFieldMapping(field, context);
    if (!mapping.editable) continue;

    shape[field.name] = applyPresence(
      applyRules(mapping.zod, definition, context.locale),
      field,
      definition,
      operation,
      context.locale,
    );
  }

  return z.object(shape);
}

/**
 * Validates input and converts it to Prisma data.
 *
 * It never throws on validation: it returns field errors, which the server
 * server action translates into the form response.
 */
export function parseWriteInput(
  resource: ResourceDefinition,
  model: ModelMetadata,
  context: MappingContext,
  input: Record<string, unknown>,
  operation: WriteOperation,
): WriteParseResult {
  const parsed = buildWriteSchema(
    resource,
    model,
    context,
    operation,
  ).safeParse(input);

  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodError(parsed.error) };
  }

  return {
    ok: true,
    data: toPrismaData(resource, model, context, parsed.data, operation),
  };
}

/**
 * Converts validated values into the shape Prisma expects.
 *
 * - Scalars: `toDb` from the mapping table (`BigInt`, `Decimal`, `DateTime`).
 * - Relaciones m2o: `{ connect: { id } }`; en update, `null` desconecta.
 */
export function toPrismaData(
  resource: ResourceDefinition,
  model: ModelMetadata,
  context: MappingContext,
  values: Record<string, unknown>,
  operation: WriteOperation,
): Record<string, unknown> {
  void resource;
  const data: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(values)) {
    const field = model.fields.find((entry) => entry.name === name);
    if (!field || value === undefined) continue;

    if (field.kind === "object") {
      if (value === null || value === "") {
        if (operation === "update") data[name] = { disconnect: true };
        continue;
      }
      data[name] = { connect: { id: value } };
      continue;
    }

    if (value === null) {
      // A required field with a default is omitted: the database fills it. A
      // nullable one is stored as null; on update, that clears the value.
      if (field.isRequired) continue;
      if (operation === "create" && field.hasDefaultValue) continue;
      data[name] = null;
      continue;
    }

    data[name] = resolveFieldMapping(field, context).toDb(value);
  }

  return data;
}

export function flattenZodError(error: z.ZodError): WriteFieldErrors {
  const fieldErrors: WriteFieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return fieldErrors;
}

/** Convierte el id de la URL al tipo del campo `@id` (`Int`, `BigInt`, string). */
export function coerceRecordId(field: FieldMetadata, value: string): unknown {
  if (field.type === "Int") return Number(value);
  if (field.type === "BigInt") return BigInt(value);
  return value;
}

function readPrismaError(error: unknown): {
  code?: string;
  meta?: Record<string, unknown>;
} {
  if (typeof error !== "object" || error === null) return {};

  const candidate = error as { code?: unknown; meta?: unknown };
  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    meta:
      typeof candidate.meta === "object" && candidate.meta !== null
        ? (candidate.meta as Record<string, unknown>)
        : undefined,
  };
}

/**
 * Translates a Prisma error into form errors.
 *
 * It imports no Prisma: it checks `code` and `meta` by shape, so it works
 * with any client version.
 */
export function formatPrismaError(
  error: unknown,
  locale: Locale = "en",
): WriteError {
  const { code, meta } = readPrismaError(error);

  if (code === "P2002") {
    const target = meta?.target;
    const fields = Array.isArray(target)
      ? target.map(String)
      : typeof target === "string"
        ? target.split(",").map((entry) => entry.trim())
        : [];

    const fieldErrors: WriteFieldErrors = {};
    for (const field of fields) {
      fieldErrors[field] = [translate(locale, "error.unique")];
    }

    return Object.keys(fieldErrors).length > 0
      ? { fieldErrors }
      : {
          fieldErrors: {},
          message: translate(locale, "error.uniqueGeneric"),
        };
  }

  if (code === "P2003") {
    return {
      fieldErrors: {},
      message: translate(locale, "error.relation"),
    };
  }

  if (code === "P2025") {
    return {
      fieldErrors: {},
      message: translate(locale, "error.notFound"),
    };
  }

  return {
    fieldErrors: {},
    message: translate(locale, "error.write"),
  };
}


// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export interface ResolvedPolicy<TUser extends CurrentUser = CurrentUser> {
  context: PolicyContext<TUser>;
  where: Record<string, unknown>;
  can: Record<string, PolicyPredicate<TUser>>;
}

export type PolicyResolution<TUser extends CurrentUser = CurrentUser> =
  | { ok: true; policy: ResolvedPolicy<TUser> }
  | {
      ok: false;
      reason:
        | "no-policy"
        | "no-policies"
        | "no-resource-policy"
        | "scope-denied";
    };

/**
 * Resolves the policy for a resource.
 *
 * Fail closed: a resource without a policy declaration, a missing policy entry,
 * or a scope function returning `null` all deny the resource.
 */
export async function resolvePolicy<TUser extends CurrentUser>(
  resource: ResourceDefinition,
  policies: PoliciesDefinition<TUser> | undefined,
  user: TUser,
): Promise<PolicyResolution<TUser>> {
  if (!resource.policy) return { ok: false, reason: "no-policy" };
  if (!policies) return { ok: false, reason: "no-policies" };

  const resourcePolicy = policies.resources[resource.model];
  if (!resourcePolicy) return { ok: false, reason: "no-resource-policy" };

  const organizationId = policies.organizationOf
    ? await policies.organizationOf(user)
    : null;
  const roles = policies.rolesOf ? await policies.rolesOf(user) : [];

  const context: PolicyContext<TUser> = { user, organizationId, roles };
  const scope = resourcePolicy.scope
    ? resourcePolicy.scope(context)
    : {};

  if (scope === null) return { ok: false, reason: "scope-denied" };

  return {
    ok: true,
    policy: {
      context,
      where: scope,
      can: resourcePolicy.can ?? {},
    },
  };
}

/**
 * Checks an operation against the policy.
 *
 * Creating a scoped row without an explicit `can.create` is denied: a read
 * scope cannot constrain an insert, so silence would be a hole.
 */
export async function canPerform<TUser extends CurrentUser>(
  policy: ResolvedPolicy<TUser>,
  operation: string,
  values?: Record<string, unknown>,
): Promise<boolean> {
  const predicate = policy.can[operation];
  if (predicate) return Boolean(await predicate(policy.context, values));

  if (operation === "create" && Object.keys(policy.where).length > 0) {
    return false;
  }

  return true;
}

/**
 * Checks a declared action's `requires` against the policy.
 *
 * Custom actions are deny-by-default: a missing predicate denies. Built-in
 * actions are handled by `canPerform`.
 */
export async function canRunAction<TUser extends CurrentUser>(
  policy: ResolvedPolicy<TUser>,
  action: ActionDefinition,
  values?: Record<string, unknown>,
): Promise<boolean> {
  if (!action.requires) return true;

  const predicate = policy.can[action.requires];
  if (!predicate) return false;

  return Boolean(await predicate(policy.context, values));
}

/** Merges a policy scope into a query `where`. */
export function withScope(
  where: Record<string, unknown>,
  scope: Record<string, unknown>,
): Record<string, unknown> {
  if (Object.keys(scope).length === 0) return where;
  if (Object.keys(where).length === 0) return { ...scope };
  return { AND: [scope, where] };
}

// ---------------------------------------------------------------------------
// Runtime factory
// ---------------------------------------------------------------------------

export interface ResourceListResult {
  rows: Record<string, unknown>[];
  total: number;
  params: NormalizedListParams;
}

export interface FormOption {
  value: string;
  label: string;
}

export class PolicyDeniedError extends Error {
  constructor(public readonly resource: string) {
    super(`Access denied by policy for ${resource}.`);
    this.name = "PolicyDeniedError";
  }
}

export interface RuntimeSaveResult {
  ok: boolean;
  fieldErrors?: WriteFieldErrors;
  message?: string;
}

export interface RuntimeActionInput {
  slug: string;
  name: string;
  id?: string;
  values?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface RuntimeActionResult extends RuntimeSaveResult {
  href?: string;
}

export interface DashboardRuntimeOptions<TUser extends CurrentUser> {
  /**
   * Prisma client. Typed as `unknown` so core does not depend on a concrete
   * generator output; the runtime only uses delegates by model name.
   */
  prisma: unknown;
  metadata: DashildMetadata;
  resources: ResourceDefinition[];
  policies: PoliciesDefinition<TUser>;
  locale?: Locale;
  actions?: Record<string, Record<string, ActionHandler<TUser>>>;
}

export interface DashboardRuntime<TUser extends CurrentUser> {
  list(
    resource: ResourceDefinition,
    raw: RawListParams,
    user: TUser,
  ): Promise<ResourceListResult>;
  record(
    resource: ResourceDefinition,
    id: string,
    user: TUser,
  ): Promise<Record<string, unknown> | null>;
  formOptions(
    resource: ResourceDefinition,
    user: TUser,
  ): Promise<Record<string, FormOption[]>>;
  save(
    input: { slug: string; id?: string; values: Record<string, unknown> },
    user: TUser,
  ): Promise<RuntimeSaveResult>;
  remove(
    input: { slug: string; id: string },
    user: TUser,
  ): Promise<RuntimeSaveResult>;
  runAction(
    input: RuntimeActionInput,
    user: TUser,
  ): Promise<RuntimeActionResult>;
}

interface RuntimeDelegate {
  findMany(args: object): Promise<Record<string, unknown>[]>;
  findFirst(args: object): Promise<Record<string, unknown> | null>;
  count(args: { where?: Record<string, unknown> }): Promise<number>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  update(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<unknown>;
  delete(args: { where: Record<string, unknown> }): Promise<unknown>;
}

function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function modelFor(
  metadata: DashildMetadata,
  name: string,
): ModelMetadata | undefined {
  return metadata.models.find((model) => model.name === name);
}

function runtimeDelegate(
  prisma: unknown,
  model: string,
): RuntimeDelegate | undefined {
  return (prisma as Record<string, RuntimeDelegate | undefined>)[
    delegateName(model)
  ];
}

function recordInclude(
  resource: ResourceDefinition,
  model: ModelMetadata,
): Record<string, unknown> | undefined {
  const fields = new Map(model.fields.map((field) => [field.name, field]));
  const include: Record<string, unknown> = {};

  const add = (name: string, display: string | undefined) => {
    const field = fields.get(name);
    if (field?.kind !== "object" || field.isList) return;

    include[name] = {
      select:
        display && display !== "id"
          ? { id: true, [display]: true }
          : { id: true },
    };
  };

  for (const column of resource.table.columns) {
    if (column.display) add(column.field, column.display);
  }
  for (const field of resource.form.fields) {
    if (field.type === "relation") add(field.field, field.display ?? "name");
  }

  return Object.keys(include).length > 0 ? include : undefined;
}

/**
 * Creates the data runtime for one app.
 *
 * The package owns the query and write logic; the app owns the Prisma client,
 * the metadata, the policies and the action handlers. Every operation resolves
 * the policy first and fails closed.
 */
export function createDashildRuntime<TUser extends CurrentUser>(
  options: DashboardRuntimeOptions<TUser>,
): DashboardRuntime<TUser> {
  const locale = options.locale ?? "en";

  function denied(): RuntimeSaveResult {
    return { ok: false, message: translate(locale, "error.denied") };
  }

  function resolve(slug: string) {
    const resource = options.resources.find(
      (entry) => entry.navigation.slug === slug,
    );
    if (!resource) return null;

    const model = modelFor(options.metadata, resource.model);
    if (!model) return null;

    const delegate = runtimeDelegate(options.prisma, resource.model);
    if (!delegate) return null;

    const idField = model.fields.find((field) => field.isId);
    if (!idField) return null;

    return { resource, model, delegate, idField };
  }

  function idFilter(
    field: FieldMetadata,
    id: string,
  ): Record<string, unknown> {
    return { [field.name]: coerceRecordId(field, id) };
  }

  async function list(
    resource: ResourceDefinition,
    raw: RawListParams,
    user: TUser,
  ): Promise<ResourceListResult> {
    const model = modelFor(options.metadata, resource.model);
    const delegate = runtimeDelegate(options.prisma, resource.model);

    if (!model || !delegate) {
      throw new Error(
        `Dashild: model "${resource.model}" is not in dashild-metadata.json. Run prisma generate.`,
      );
    }

    const policy = await resolvePolicy(resource, options.policies, user);
    if (!policy.ok || !(await canPerform(policy.policy, "list"))) {
      throw new PolicyDeniedError(resource.model);
    }

    const params = normalizeListParams(resource, raw);
    const query = buildListQuery(resource, model, params);
    const where = withScope(query.where, policy.policy.where);

    const [rows, total] = await Promise.all([
      delegate.findMany({ ...query, where }),
      delegate.count({ where }),
    ]);

    const context = listContext(options.metadata, locale);

    return {
      rows: rows.map((row) => toDTO(row, model, resource, context)),
      total,
      params,
    };
  }

  async function record(
    resource: ResourceDefinition,
    id: string,
    user: TUser,
  ): Promise<Record<string, unknown> | null> {
    const model = modelFor(options.metadata, resource.model);
    const delegate = runtimeDelegate(options.prisma, resource.model);
    const idField = model?.fields.find((field) => field.isId);

    if (!model || !delegate || !idField) {
      throw new Error(
        `Dashild: model "${resource.model}" has no delegate or primary key.`,
      );
    }

    const policy = await resolvePolicy(resource, options.policies, user);
    if (!policy.ok || !(await canPerform(policy.policy, "view"))) {
      throw new PolicyDeniedError(resource.model);
    }

    const include = recordInclude(resource, model);
    const where = withScope(
      idFilter(idField, id),
      policy.policy.where,
    );

    let row: Record<string, unknown> | null;
    try {
      row = await delegate.findFirst({
        where,
        ...(include ? { include } : {}),
      });
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : undefined;
      if (code === "P2007" || code === "P2023" || code === "P2025") {
        return null;
      }
      throw error;
    }

    if (!row) return null;

    return toDTO(
      row,
      model,
      resource,
      listContext(options.metadata, locale),
    );
  }

  async function formOptions(
    resource: ResourceDefinition,
    user: TUser,
  ): Promise<Record<string, FormOption[]>> {
    const model = modelFor(options.metadata, resource.model);
    if (!model) return {};

    const policy = await resolvePolicy(resource, options.policies, user);
    if (!policy.ok) throw new PolicyDeniedError(resource.model);

    const organizationId = policy.policy.context.organizationId;
    const result: Record<string, FormOption[]> = {};

    for (const definition of resource.form.fields) {
      const field = model.fields.find(
        (entry) => entry.name === definition.field,
      );
      if (!field) continue;

      if (
        definition.type === "relation" &&
        field.kind === "object" &&
        !field.isList
      ) {
        const related = modelFor(options.metadata, field.type);
        const delegate = runtimeDelegate(options.prisma, field.type);
        if (!related || !delegate) continue;

        if (!organizationId) {
          result[definition.field] = [];
          continue;
        }

        const idField = related.fields.find((entry) => entry.isId)?.name ?? "id";
        const display = definition.display ?? "name";

        const where =
          field.type === "Organization"
            ? { id: organizationId }
            : related.fields.some(
                  (entry) => entry.name === "organizationId",
                )
              ? { organizationId }
              : {};

        const rows = await delegate.findMany({
          where,
          select: { [idField]: true, [display]: true },
          orderBy: { [display]: "asc" },
          take: 200,
        });

        result[definition.field] = rows.map((row) => ({
          value: String(row[idField] ?? ""),
          label: String(row[display] ?? row[idField] ?? ""),
        }));
        continue;
      }

      if (definition.type === "select" && field.kind === "enum") {
        const values =
          options.metadata.enums.find((entry) => entry.name === field.type)
            ?.values ?? [];
        result[definition.field] = values.map((value) => ({
          value,
          label: value,
        }));
      }
    }

    return result;
  }

  async function save(
    input: { slug: string; id?: string; values: Record<string, unknown> },
    user: TUser,
  ): Promise<RuntimeSaveResult> {
    const context = resolve(input.slug);
    if (!context) {
      return { ok: false, message: translate(locale, "error.resourceNotFound") };
    }

    const { resource, model, delegate, idField } = context;
    const operation = input.id ? "update" : "create";

    const resolved = await resolvePolicy(resource, options.policies, user);
    if (!resolved.ok) return denied();

    if (!(await canPerform(resolved.policy, operation, input.values))) {
      return denied();
    }

    const parsed = parseWriteInput(
      resource,
      model,
      mappingContext(options.metadata, locale),
      input.values,
      operation,
    );

    if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

    try {
      if (operation === "create") {
        await delegate.create({ data: parsed.data });
      } else {
        await delegate.update({
          where: withScope(
            idFilter(idField, input.id as string),
            resolved.policy.where,
          ),
          data: parsed.data,
        });
      }
    } catch (error) {
      return { ok: false, ...formatPrismaError(error, locale) };
    }

    return { ok: true };
  }

  async function remove(
    input: { slug: string; id: string },
    user: TUser,
  ): Promise<RuntimeSaveResult> {
    const context = resolve(input.slug);
    if (!context) {
      return { ok: false, message: translate(locale, "error.resourceNotFound") };
    }

    const { resource, delegate, idField } = context;

    const resolved = await resolvePolicy(resource, options.policies, user);
    if (!resolved.ok) return denied();
    if (!(await canPerform(resolved.policy, "delete"))) return denied();

    try {
      await delegate.delete({
        where: withScope(
          idFilter(idField, input.id),
          resolved.policy.where,
        ),
      });
    } catch (error) {
      return { ok: false, ...formatPrismaError(error, locale) };
    }

    return { ok: true };
  }

  async function runAction(
    input: RuntimeActionInput,
    user: TUser,
  ): Promise<RuntimeActionResult> {
    const context = resolve(input.slug);
    if (!context) {
      return { ok: false, message: translate(locale, "error.resourceNotFound") };
    }

    const { resource } = context;

    const resolved = await resolvePolicy(resource, options.policies, user);
    if (!resolved.ok) return denied();

    const action = findAction(resource, input.name, locale);
    if (!action) {
      return {
        ok: false,
        message: translate(locale, "error.actionNotDeclared", {
          name: input.name,
        }),
      };
    }

    if (!(await canRunAction(resolved.policy, action, input.values))) {
      return denied();
    }

    const handler = options.actions?.[resource.model]?.[input.name];
    if (!handler) {
      return {
        ok: false,
        message: translate(locale, "error.actionNoHandler", {
          name: input.name,
        }),
      };
    }

    try {
      return await handler({
        resource,
        user,
        id: input.id,
        values: input.values,
        data: input.data ?? action.data,
        organizationId: resolved.policy.context.organizationId,
        roles: resolved.policy.context.roles,
      });
    } catch {
      return { ok: false, message: translate(locale, "error.actionFailed") };
    }
  }

  return { list, record, formOptions, save, remove, runAction };
}
