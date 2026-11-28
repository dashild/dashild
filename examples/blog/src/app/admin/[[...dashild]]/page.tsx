// dashild:generated 0.1.0-alpha.12
import { cookies } from "next/headers";

import { DEFAULT_THEME_MODE, type ThemeMode } from "@dashild/admin";
import { AdminPage } from "@dashild/admin/server";

import { AppIconProvider } from "../../../dashild/icons";
import { AppRegistryProvider } from "../../../dashild/registry";
import { panel } from "../../../dashild/panel";
import { policies } from "../../../dashild/policies";
import { runtime } from "../../../dashild/runtime";
import {
  deleteResource,
  exportResource,
  importResource,
  runRelationAction,
  runResourceAction,
  saveResource,
  toggleTheme,
} from "../../../dashild/server";

/**
 * Dashild mount route.
 *
 * Routing, policy and data loading live in @dashild/admin/server. This file
 * only wires the app's session and server actions.
 */

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const THEME_COOKIE = "dashild_theme";

export default async function DashildPage({
  params,
  searchParams,
}: {
  params: Promise<{ dashild?: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  const store = await cookies();
  const cookieTheme = store.get(THEME_COOKIE)?.value;
  const theme: ThemeMode =
    cookieTheme === "light" || cookieTheme === "dark" || cookieTheme === "system"
      ? cookieTheme
      : panel.theme?.defaultMode ?? DEFAULT_THEME_MODE;

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
        exportAction={exportResource}
        importAction={importResource}
      />
    </AppRegistryProvider>
  );
}
