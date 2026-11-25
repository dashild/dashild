import type { Locale, ResourceDefinition } from "@dashild/core";
import type {
  FormOption,
  ResourceListResult,
} from "@dashild/core/server";

import type { SessionUser } from "@/lib/session";

import { runtime } from "../runtime";

export { PolicyDeniedError } from "@dashild/core/server";
export type { FormOption, ResourceListResult };

/**
 * Read side of the runtime.
 *
 * The app route asks these wrappers for lists, records and options; the
 * generic logic (policy scope, query building, DTOs) lives in
 * `@dashild/core/server`.
 */

export async function loadResourceList(
  resource: ResourceDefinition,
  raw: Record<string, string | string[] | undefined>,
  _locale: Locale,
  user: SessionUser,
): Promise<ResourceListResult> {
  return runtime.list(resource, raw, user);
}

export async function loadResourceRecord(
  resource: ResourceDefinition,
  id: string,
  _locale: Locale,
  user: SessionUser,
): Promise<Record<string, unknown> | null> {
  return runtime.record(resource, id, user);
}

export async function loadFormOptions(
  resource: ResourceDefinition,
  user: SessionUser,
): Promise<Record<string, FormOption[]>> {
  return runtime.formOptions(resource, user);
}
