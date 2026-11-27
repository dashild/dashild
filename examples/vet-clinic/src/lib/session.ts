import { cookies, headers } from "next/headers";

import { auth } from "./auth";
import { ORGANIZATION_COOKIE } from "./organization";
import { prisma } from "./prisma";

/** The signed-in app user, with the active organization resolved. */
export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const record = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true, role: true },
  });

  const store = await cookies();
  const requested = store.get(ORGANIZATION_COOKIE)?.value;
  const isAdmin = record?.role === "ADMIN";
  let organizationId = record?.organizationId ?? null;

  // An admin may switch to any organization; a member stays in their own.
  if (requested && isAdmin) {
    const target = await prisma.organization.findUnique({
      where: { id: requested },
      select: { id: true },
    });
    if (target) organizationId = target.id;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    organizationId,
    roles: record?.role ? [record.role] : [],
  };
}
