"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  listOrganizations,
  ORGANIZATION_COOKIE,
} from "@/lib/organizations";
import { getSessionUser } from "@/lib/session";
import { THEME_COOKIE, type ThemeMode } from "@/lib/theme";

/**
 * Acciones del panel.
 *
 * `signOut` es el `panel.auth.signOut` que el shell recibe como prop. El shell
 * no importa Better Auth: solo ejecuta la acción que le pasan.
 */

export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

/**
 * Cambia la organización activa del panel.
 *
 * Un admin puede cambiar a cualquiera; un usuario normal solo a la suya. La
 * comprobación es de servidor: una cookie manipulada no amplía el acceso.
 */
export async function switchOrganization(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const requested = String(formData.get("organizationId") ?? "");
  const organizations = await listOrganizations();
  const target = organizations.find(
    (organization) => organization.id === requested,
  );

  const isAdmin = user.roles.includes("ADMIN");
  const allowed = target && (isAdmin || target.id === user.organizationId);

  if (allowed) {
    const store = await cookies();
    store.set(ORGANIZATION_COOKIE, target.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  redirect("/admin");
}

export async function toggleTheme(formData: FormData): Promise<void> {
  const store = await cookies();
  const current = store.get(THEME_COOKIE)?.value;
  const next: ThemeMode = current === "dark" ? "light" : "dark";

  store.set(THEME_COOKIE, next, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  const target = formData.get("next");
  const safeTarget =
    typeof target === "string" &&
    target.startsWith("/") &&
    !target.startsWith("//")
      ? target
      : "/admin";

  redirect(safeTarget);
}
