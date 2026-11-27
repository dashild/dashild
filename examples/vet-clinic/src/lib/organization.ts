import { cookies } from "next/headers";

import { prisma } from "./prisma";

export const ORGANIZATION_COOKIE = "dashild_organization";

export interface OrganizationOption {
  id: string;
  name: string;
}

/**
 * Organizations the user may see and the active one for this request.
 *
 * Admins can switch to any organization; a member only sees their own.
 */
export async function getOrganizationContext(user: {
  organizationId?: string | null;
  roles?: string[];
}): Promise<{
  organizations: OrganizationOption[];
  activeOrganizationId: string | null;
}> {
  const isAdmin = user.roles?.includes("ADMIN") ?? false;

  const organizations = await prisma.organization.findMany({
    where: isAdmin ? {} : { id: user.organizationId ?? "__none__" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const store = await cookies();
  const requested = store.get(ORGANIZATION_COOKIE)?.value;
  const allowed =
    Boolean(requested) &&
    organizations.some((organization) => organization.id === requested);
  const active = allowed && requested
    ? requested
    : user.organizationId &&
        organizations.some(
          (organization) => organization.id === user.organizationId,
        )
      ? user.organizationId
      : organizations[0]?.id ?? null;

  return { organizations, activeOrganizationId: active };
}
