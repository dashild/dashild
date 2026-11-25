"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { translate } from "@dashild/core";
import type {
  RuntimeActionInput,
  RuntimeActionResult,
  RuntimeSaveResult,
} from "@dashild/core/server";

import { panel } from "../panel";
import { runtime } from "../runtime";

/**
 * Server actions.
 *
 * The generic write logic lives in `@dashild/core/server`; this module only
 * checks the session, revalidates and redirects. The client sends a slug, an
 * id and values; it never sends a `where`, a policy or a scope.
 */

export type SaveResult = RuntimeSaveResult;
export type RunActionInput = RuntimeActionInput;
export type RunActionResult = RuntimeActionResult;

export async function saveResource(input: {
  slug: string;
  id?: string;
  values: Record<string, unknown>;
}): Promise<SaveResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  const result = await runtime.save(input, user);
  if (!result.ok) return result;

  revalidatePath(`${panel.path}/${input.slug}`);
  redirect(`${panel.path}/${input.slug}`);
}

export async function deleteResource(input: {
  slug: string;
  id: string;
}): Promise<SaveResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  const result = await runtime.remove(input, user);
  if (!result.ok) return result;

  revalidatePath(`${panel.path}/${input.slug}`);
  redirect(`${panel.path}/${input.slug}`);
}

export async function runResourceAction(
  input: RunActionInput,
): Promise<RunActionResult> {
  const user = await panel.auth.getCurrentUser();
  if (!user) {
    return { ok: false, message: translate(panel.locale, "error.session") };
  }

  return runtime.runAction(input, user);
}
