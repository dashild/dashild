import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

/**
 * Organización activa del panel.
 *
 * El switcher del sidebar escribe una cookie, pero **el servidor la valida en
 * cada petición**: un admin puede cambiar a cualquier organización; un usuario
 * normal solo a la suya. Si la cookie no es válida, se ignora.
 */

export const ORGANIZATION_COOKIE = "dashild_organization";

export interface OrganizationOption {
  id: string;
  name: string;
}

export interface OrganizationContext {
  id: string | null;
  name: string | null;
  options: OrganizationOption[];
}

export async function listOrganizations(): Promise<OrganizationOption[]> {
  return prisma.organization.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function resolveActiveOrganization(
  user: SessionUser,
): Promise<OrganizationContext> {
  const organizations = await listOrganizations();
  const isAdmin = user.roles.includes("ADMIN");

  const options = isAdmin
    ? organizations
    : organizations.filter((organization) => organization.id === user.organizationId);

  const store = await cookies();
  const requested = store.get(ORGANIZATION_COOKIE)?.value;

  const active =
    options.find((organization) => organization.id === requested) ??
    options.find((organization) => organization.id === user.organizationId) ??
    options[0] ??
    null;

  return {
    id: active?.id ?? null,
    name: active?.name ?? null,
    options,
  };
}
