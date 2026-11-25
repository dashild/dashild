import { AdminPage } from "@dashild/admin/server";

import { AppIconProvider } from "@/components/dashild/icon-provider";
import { AppRegistryProvider } from "@/src/dashild/registry";
import { switchOrganization, toggleTheme } from "@/lib/auth-actions";
import { resolveActiveOrganization } from "@/lib/organizations";
import { DEFAULT_THEME_MODE, getThemeMode } from "@/lib/theme";
import { panel } from "@/src/dashild/panel";
import { policies } from "@/src/dashild/policies";
import { runtime } from "@/src/dashild/runtime";
import {
  deleteResource,
  runRelationAction,
  runResourceAction,
  saveResource,
} from "@/src/dashild/server/write";

/**
 * Mount route.
 *
 * All routing, policy and data work lives in `@dashild/admin/server`. This file
 * only wires the app's session, theme, organization switcher and server
 * actions.
 */

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminRoute({
  params,
  searchParams,
}: {
  params: Promise<{ dashild?: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  const theme = await getThemeMode(panel.theme?.defaultMode ?? DEFAULT_THEME_MODE);
  const user = await panel.auth.getCurrentUser();
  const organization = user
    ? await resolveActiveOrganization(user)
    : { id: null, name: null, options: [] };

  return (
    <AppRegistryProvider>
      <AdminPage
        panel={panel}
        policies={policies}
        runtime={runtime}
        saveAction={saveResource}
        deleteAction={deleteResource}
        runAction={runResourceAction}
        relationAction={runRelationAction}
        IconProvider={AppIconProvider}
        params={params}
        searchParams={searchParams}
        theme={theme}
        themeToggle={panel.theme?.toggle ?? false}
        themeAction={toggleTheme}
        organizations={organization.options}
        activeOrganizationId={organization.id}
        switchOrganization={switchOrganization}
        accountHref="/dashboard"
      />
    </AppRegistryProvider>
  );
}