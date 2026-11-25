import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { resolveActiveOrganization } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

/**
 * Usuario actual de la app.
 *
 * Better Auth resuelve la sesión; Prisma aporta los campos de dominio. La
 * organización que devuelve es la **activa** (cookie validada en servidor), no
 * la del registro: así el switcher del sidebar tiene efecto real.
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  organizationId: string | null;
  roles: string[];
}

/** Usuario de la sesión con su organización de origen, sin aplicar el switcher. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      organizationId: true,
      role: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    organizationId: user.organizationId,
    roles: [user.role],
  };
}

/** Usuario del panel, con la organización activa ya resuelta. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const organization = await resolveActiveOrganization(user);

  return { ...user, organizationId: organization.id };
}
