"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { translate } from "@dashild/core";
import type {
  RelationActionInput,
  RuntimeActionInput,
  RuntimeActionResult,
  RuntimeSaveResult,
} from "@dashild/core/server";

import { panel } from "./panel";
import { runtime } from "./runtime";

/**
 * Server actions for the panel.
 *
 * The client sends a slug, an id and values; it never sends a where, a policy
 * or an organization scope. The runtime resolves and enforces all of them.
 */

const THEME_COOKIE = "dashild_theme";

export async function toggleTheme(formData: FormData): Promise<void> {
  const store = await cookies();
  const current = store.get(THEME_COOKIE)?.value;
  const next =
    current === "dark" ? "system" : current === "system" ? "light" : "dark";

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
      : panel.path;

  redirect(safeTarget);
}

export async function saveResource(input: {
  slug: string;
  id?: string;
  values: Record<string, unknown>;
}): Promise<RuntimeSaveResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  const result = await runtime.save(input, user);
  if (!result.ok) return result;

  revalidatePath(`${panel.path}/${input.slug}`);
  redirect(`${panel.path}/${input.slug}?flash=saved`);
}

export async function deleteResource(input: {
  slug: string;
  id: string;
}): Promise<RuntimeSaveResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  const result = await runtime.remove(input, user);
  if (!result.ok) return result;

  revalidatePath(`${panel.path}/${input.slug}`);
  redirect(`${panel.path}/${input.slug}?flash=deleted`);
}

export async function runResourceAction(
  input: RuntimeActionInput,
): Promise<RuntimeActionResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  return runtime.runAction(input, user);
}

export async function runRelationAction(
  input: RelationActionInput,
): Promise<RuntimeSaveResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  const result = await runtime.relationAction(input, user);
  if (result.ok) {
    revalidatePath(
      `${panel.path}/${input.parentSlug}/${input.parentId}`,
    );
  }
  return result;
}
