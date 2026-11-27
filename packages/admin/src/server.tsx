import { notFound, redirect } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

import {
  isBuiltInAction,
  resolveFormActions,
  resolveTableActions,
  translate,
  type CurrentUser,
  type Locale,
  type PanelDefinition,
  type PoliciesDefinition,
  type ResourceDefinition,
} from "@dashild/core";
import {
  canPerform,
  canRunAction,
  PolicyDeniedError,
  resolvePolicy,
  type DashboardRuntime,
} from "@dashild/core/server";

import { AdminShell } from "./components/admin-shell.js";
import { DashboardHome } from "./components/dashboard-home.js";
import { ResourceDetail } from "./components/resource-detail.js";
import { ResourceForm } from "./components/resource-form.js";
import { ResourceTable } from "./components/resource-table.js";
import type { NavGroup } from "./components/nav-main.js";
import type { ThemeMode } from "./theme.js";
import type {
  DeleteAction,
  RelationAction,
  RunAction,
  SaveAction,
} from "./types.js";

type SearchParams = Record<string, string | string[] | undefined>;

export interface AdminPageProps<TUser extends CurrentUser> {
  panel: PanelDefinition<TUser>;
  policies: PoliciesDefinition<TUser>;
  runtime: DashboardRuntime<TUser>;
  saveAction: SaveAction;
  deleteAction: DeleteAction;
  runAction: RunAction;
  relationAction?: RelationAction;
  /** A client component that mounts the app's icon registry. */
  IconProvider: ComponentType<{ children: ReactNode }>;
  params: Promise<{ dashild?: string[] }>;
  searchParams: Promise<SearchParams>;
  theme: ThemeMode;
  themeToggle?: boolean;
  themeAction?: (formData: FormData) => Promise<void>;
  organizations?: { id: string; name: string }[];
  activeOrganizationId?: string | null;
  switchOrganization?: (formData: FormData) => Promise<void>;
  accountHref?: string;
  loginPath?: string;
}

/**
 * The panel route.
 *
 * A server component: it resolves the session, policies and data, then hands
 * serializable data and server actions to the shell. The mount route stays a
 * few lines and does not know about resources, policies or Prisma queries.
 */
export async function AdminPage<TUser extends CurrentUser>({
  panel,
  policies,
  runtime,
  saveAction,
  deleteAction,
  runAction,
  relationAction,
  IconProvider,
  params,
  searchParams,
  theme,
  themeToggle = false,
  themeAction,
  organizations,
  activeOrganizationId,
  switchOrganization,
  accountHref,
  loginPath = "/login",
}: AdminPageProps<TUser>) {
  const user = await panel.auth.getCurrentUser();
  if (!user) redirect(`${loginPath}?next=${encodeURIComponent(panel.path)}`);

  const { dashild = [] } = await params;
  const raw = await searchParams;
  const [slug, second, third] = dashild;

  const resource = slug
    ? panel.resources.find((entry) => entry.navigation.slug === slug)
    : undefined;

  if (slug && !resource) notFound();

  const locale = panel.locale ?? "en";
  const section = !resource
    ? translate(locale, "shell.dashboard")
    : second === "create"
      ? translate(locale, "shell.createTitle", {
          label: resource.navigation.label,
        })
      : third === "edit"
        ? translate(locale, "shell.editTitle", {
            label: resource.navigation.label,
          })
        : resource.navigation.label;
  const nextPath = resource
    ? `${panel.path}/${resource.navigation.slug}`
    : panel.path;

  const groupsMap = new Map<string, NavGroup>();
  for (const entry of panel.resources) {
    const label = entry.navigation.group ?? "General";
    const group = groupsMap.get(label) ?? { label, resources: [] };
    group.resources.push({
      label: entry.navigation.label,
      url: `${panel.path}/${entry.navigation.slug}`,
      icon: entry.navigation.icon,
    });
    groupsMap.set(label, group);
  }
  const groups = [...groupsMap.values()];

  return (
    <IconProvider>
      <AdminShell
        title={panel.title}
        path={panel.path}
        section={section}
        theme={theme}
        primary={panel.theme?.primary}
        themeToggle={themeToggle}
        nextPath={nextPath}
        maxContentWidth={panel.maxContentWidth}
        sidebarCollapsible={panel.sidebar?.collapsible}
        groups={groups}
        user={{
          name: user.name ?? user.email ?? translate(locale, "shell.user"),
          email: user.email ?? "",
        }}
        signOut={panel.auth.signOut}
        organizations={organizations}
        activeOrganizationId={activeOrganizationId}
        switchOrganization={switchOrganization}
        themeAction={themeAction}
        locale={locale}
        accountHref={accountHref}
        brand={panel.brand}
      >
        {!resource ? (
          <DashboardHome
            resources={panel.resources}
            path={panel.path}
            locale={locale}
          />
        ) : second === "create" ? (
          <ResourceFormPage
            runtime={runtime}
            resource={resource}
            locale={locale}
            user={user}
            policies={policies}
            saveAction={saveAction}
            runAction={runAction}
            basePath={panel.path}
            mode="create"
          />
        ) : second && third === "edit" ? (
          <ResourceFormPage
            runtime={runtime}
            resource={resource}
            id={second}
            locale={locale}
            user={user}
            policies={policies}
            saveAction={saveAction}
            runAction={runAction}
            basePath={panel.path}
            mode="edit"
          />
        ) : second ? (
          <ResourceViewPage
            runtime={runtime}
            resource={resource}
            id={second}
            locale={locale}
            user={user}
            policies={policies}
            {...(relationAction ? { relationAction } : {})}
            basePath={panel.path}
          />
        ) : (
          <ResourceContent
            runtime={runtime}
            resource={resource}
            raw={raw}
            locale={locale}
            user={user}
            policies={policies}
            deleteAction={deleteAction}
            runAction={runAction}
            basePath={panel.path}
          />
        )}
      </AdminShell>
    </IconProvider>
  );
}

/** Operations the current user may perform on a resource. */
async function resourceCapabilities<TUser extends CurrentUser>(
  resource: ResourceDefinition,
  policies: PoliciesDefinition<TUser>,
  locale: Locale,
  user: TUser,
) {
  const resolved = await resolvePolicy(resource, policies, user);
  if (!resolved.ok) {
    return {
      ok: false as const,
      canCreate: false,
      canView: false,
      canUpdate: false,
      canDelete: false,
      allowedActions: [] as string[],
    };
  }

  // A create predicate may depend on the values (for example, the target
  // organization). The UI asks with the active organization as the candidate;
  // the server still checks the values actually submitted.
  const candidate = resolved.policy.context.organizationId
    ? {
        organization: resolved.policy.context.organizationId,
        organizationId: resolved.policy.context.organizationId,
      }
    : undefined;

  const [canCreate, canView, canUpdate, canDelete] = await Promise.all([
    canPerform(resolved.policy, "create", candidate),
    canPerform(resolved.policy, "view"),
    canPerform(resolved.policy, "update"),
    canPerform(resolved.policy, "delete"),
  ]);

  const custom = [
    ...resolveTableActions(resource, locale),
    ...resolveFormActions(resource, locale),
  ].filter((action) => !isBuiltInAction(action.name));

  const allowedActions = (
    await Promise.all(
      custom.map(async (action) =>
        (await canRunAction(resolved.policy, action)) ? action.name : null,
      ),
    )
  ).filter((name): name is string => name !== null);

  return {
    ok: true as const,
    canCreate,
    canView,
    canUpdate,
    canDelete,
    allowedActions: [...new Set(allowedActions)],
  };
}

async function ResourceContent<TUser extends CurrentUser>({
  runtime,
  resource,
  raw,
  locale,
  user,
  policies,
  deleteAction,
  runAction,
  basePath,
}: {
  runtime: DashboardRuntime<TUser>;
  resource: ResourceDefinition;
  raw: SearchParams;
  locale: Locale;
  user: TUser;
  policies: PoliciesDefinition<TUser>;
  deleteAction: DeleteAction;
  runAction: RunAction;
  basePath: string;
}) {
  let data;
  try {
    data = await runtime.list(resource, raw, user);
  } catch (error) {
    if (error instanceof PolicyDeniedError) notFound();
    throw error;
  }

  const capabilities = await resourceCapabilities(
    resource,
    policies,
    locale,
    user,
  );

  const filterOptions = resource.table.filters?.length
    ? await runtime.filterOptions(resource, user)
    : {};

  return (
    <ResourceTable
      resource={resource}
      rows={data.rows}
      total={data.total}
      params={data.params}
      locale={locale}
      canCreate={capabilities.canCreate}
      canView={capabilities.canView}
      canUpdate={capabilities.canUpdate}
      canDelete={capabilities.canDelete}
      allowedActions={capabilities.allowedActions}
      filterOptions={filterOptions}
      deleteAction={deleteAction}
      runAction={runAction}
      basePath={`${basePath}/${resource.navigation.slug}`}
    />
  );
}

async function ResourceFormPage<TUser extends CurrentUser>({
  runtime,
  resource,
  id,
  locale,
  user,
  policies,
  saveAction,
  runAction,
  basePath,
  mode,
}: {
  runtime: DashboardRuntime<TUser>;
  resource: ResourceDefinition;
  id?: string;
  locale: Locale;
  user: TUser;
  policies: PoliciesDefinition<TUser>;
  saveAction: SaveAction;
  runAction: RunAction;
  basePath: string;
  mode: "create" | "edit";
}) {
  const capabilities = await resourceCapabilities(
    resource,
    policies,
    locale,
    user,
  );
  if (mode === "create" ? !capabilities.canCreate : !capabilities.canUpdate) {
    notFound();
  }

  let options;
  let values = null;

  try {
    options = await runtime.formOptions(resource, user, id);
    values = id ? await runtime.record(resource, id, user) : null;
  } catch (error) {
    if (error instanceof PolicyDeniedError) notFound();
    throw error;
  }

  if (id && !values) notFound();

  const title =
    mode === "create"
      ? translate(locale, "shell.createTitle", {
          label: resource.navigation.label,
        })
      : translate(locale, "shell.editTitle", {
          label: resource.navigation.label,
        });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {translate(locale, "shell.formHint")}
        </p>
      </div>
      <ResourceForm
        slug={resource.navigation.slug}
        path={basePath}
        resource={resource}
        id={id}
        values={values}
        options={options}
        actions={resolveFormActions(resource, locale)}
        saveAction={saveAction}
        runAction={runAction}
        locale={locale}
        allowedActions={capabilities.allowedActions}
      />
    </div>
  );
}

async function ResourceViewPage<TUser extends CurrentUser>({
  runtime,
  resource,
  id,
  locale,
  user,
  policies,
  relationAction,
  basePath,
}: {
  runtime: DashboardRuntime<TUser>;
  resource: ResourceDefinition;
  id: string;
  locale: Locale;
  user: TUser;
  policies: PoliciesDefinition<TUser>;
  relationAction?: RelationAction;
  basePath: string;
}) {
  let row;
  try {
    row = await runtime.record(resource, id, user);
  } catch (error) {
    if (error instanceof PolicyDeniedError) notFound();
    throw error;
  }

  if (!row) notFound();

  const capabilities = await resourceCapabilities(
    resource,
    policies,
    locale,
    user,
  );
  let relations: Awaited<
    ReturnType<DashboardRuntime<TUser>["relationManagers"]>
  > = [];
  if (relationAction) {
    try {
      relations = await runtime.relationManagers(resource, id, user);
    } catch (error) {
      if (!(error instanceof PolicyDeniedError)) throw error;
    }
  }

  return (
    <ResourceDetail
      resource={resource}
      path={basePath}
      row={row}
      locale={locale}
      canUpdate={capabilities.canUpdate}
      relations={relations}
      relationAction={relationAction}
    />
  );
}
