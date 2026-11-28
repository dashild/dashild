// dashild:generated 0.1.0-alpha.11
import { headers } from "next/headers";

import { auth } from "./auth";

/** The signed-in app user, or null. */
export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}
