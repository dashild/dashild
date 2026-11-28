import { headers } from "next/headers";

import { auth } from "./auth";
import { prisma } from "./prisma";

/** Signed-in staff with the blog role resolved from the database. */
export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const record = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    roles: record?.role ? [record.role] : [],
  };
}
