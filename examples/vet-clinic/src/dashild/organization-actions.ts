"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "../lib/prisma";
import { ORGANIZATION_COOKIE } from "../lib/organization";
import { getCurrentUser } from "../lib/session";

export async function switchOrganization(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const target = formData.get("organizationId") ?? formData.get("organization");
  const next = formData.get("next");
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/admin";

  if (!user || typeof target !== "string") redirect(safeNext);

  const isAdmin = user.roles?.includes("ADMIN") ?? false;

  if (isAdmin) {
    const exists = await prisma.organization.findUnique({
      where: { id: target },
      select: { id: true },
    });
    if (!exists) redirect(safeNext);
  } else if (target !== user.organizationId) {
    redirect(safeNext);
  }

  const store = await cookies();
  store.set(ORGANIZATION_COOKIE, target, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(safeNext);
}
