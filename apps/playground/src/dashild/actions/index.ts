import type { ActionHandler } from "@dashild/core";

/**
 * Handlers de acciones por modelo.
 *
 * Cuando un recurso necesita una acción propia, crea `./<modelo>.ts` con:
 *
 * ```ts
 * import type { ActionHandler } from "@dashild/core";
 *
 * export const actions = {
 *   export: async ({ id }) => ({ ok: true, message: "Exportado." }),
 * } satisfies Record<string, ActionHandler>;
 * ```
 *
 * y regístralo aquí:
 *
 * ```ts
 * import { actions as user } from "./user";
 * export const resourceActions = { User: user };
 * ```
 *
 * Los nombres integrados (`create`, `view`, `edit`, `delete`, `save`, `cancel`)
 * no van aquí: los resuelve el shell.
 */
export const resourceActions: Record<
  string,
  Record<string, ActionHandler>
> = {};
