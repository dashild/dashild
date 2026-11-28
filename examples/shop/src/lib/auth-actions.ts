"use server";

// dashild:generated 0.1.0-alpha.11

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
