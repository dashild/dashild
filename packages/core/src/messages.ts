/**
 * Message catalog.
 *
 * Framework strings never live inline: they are keys resolved against this
 * catalog. English is the default and the fallback; Spanish is the first
 * additional locale. More locales can be added without touching runtime code.
 */

export type Locale = "en" | "es";

export const DEFAULT_LOCALE: Locale = "en";

const en = {
  "validation.uuid": "Must be a valid UUID.",
  "validation.email": "Must be a valid email.",
  "validation.integer": "Must be an integer.",
  "validation.finite": "Must be a finite number.",
  "validation.decimal":
    "Must be a valid decimal, for example 19.99 or -0.5.",
  "validation.bigint": "Must be an integer without decimals.",
  "validation.date": "Must be a valid date (ISO 8601).",
  "validation.required": "This field is required.",
  "validation.select": "Select an option.",
  "validation.minLength": "Must be at least {min} characters.",
  "validation.maxLength": "Must be at most {max} characters.",
  "validation.min": "Must be at least {min}.",
  "validation.max": "Must be at most {max}.",
  "validation.pattern": "Invalid format.",

  "error.unique": "This value is already in use.",
  "error.uniqueGeneric": "A record with this data already exists.",
  "error.relation": "The related record does not exist or is not accessible.",
  "error.notFound": "The record no longer exists.",
  "error.write": "Could not save the record.",
  "error.denied": "You do not have access to this resource.",

  "action.create": "Create",
  "action.view": "View",
  "action.edit": "Edit",
  "action.delete": "Delete",
  "action.save": "Save",
  "action.cancel": "Cancel",
  "action.deleteConfirm": "This action cannot be undone.",

  "shell.dashboard": "Dashboard",
  "shell.panel": "Panel",
  "shell.list": "List",
  "shell.administration": "Administration",
  "shell.account": "My account",
  "shell.signOut": "Sign out",
  "shell.user": "User",
  "shell.organizations": "Organizations",
  "shell.noOrganization": "No organization",
  "shell.noOrganizations": "No organizations assigned",
  "shell.record": "{count} record",
  "shell.records": "{count} records",
  "shell.searchPlaceholder": "Search…",
  "shell.search": "Search",
  "shell.clear": "Clear",
  "shell.noResults": "No results",
  "shell.noMatches": "No matches for “{query}”.",
  "shell.empty": "No records yet.",
  "shell.actions": "Actions",
  "shell.previous": "Previous",
  "shell.next": "Next",
  "shell.page": "Page {page} of {total}",
  "shell.createTitle": "Create {label}",
  "shell.editTitle": "Edit {label}",
  "shell.formHint":
    "The server performs the final validation; the form only avoids unnecessary round trips.",
  "shell.detailSubtitle": "Record detail",
  "shell.data": "Data",
  "shell.back": "Back",
  "shell.saving": "Saving…",
  "shell.confirm": "Confirm",
  "shell.actionDone": "Action completed.",
  "shell.saved": "Saved.",
  "shell.deleted": "Deleted.",
  "shell.confirmAction": "Do you confirm this action?",
  "shell.changeTheme": "Change theme",
  "shell.deleteTitle": "Delete this record?",
  "shell.selectOption": "Select an option",
  "shell.noValue": "No value",
  "shell.noResources": "No resources yet",
  "shell.noResourcesDescription":
    "The panel already has a sidebar, login and this page. Only the first resource is missing.",
  "shell.dashboardDescription":
    "The panel is mounted. The resources declared in panel.ts appear here.",
  "shell.model": "Model",
  "shell.open": "Open",
  "shell.lightMode": "Light mode",
  "shell.darkMode": "Dark mode",

  "error.session": "Your session expired. Sign in again.",
  "error.resourceNotFound": "Resource not found.",
  "error.actionNotDeclared": 'Action "{name}" is not declared in the resource.',
  "error.actionNoHandler":
    'Action "{name}" has no handler in src/dashild/actions.',
  "error.actionFailed": "The action failed.",
  "error.deleteFailed": "Could not delete the record.",
} as const;

export type MessageKey = keyof typeof en;

const es: Record<MessageKey, string> = {
  "validation.uuid": "Debe ser un UUID válido.",
  "validation.email": "Debe ser un email válido.",
  "validation.integer": "Debe ser un número entero.",
  "validation.finite": "Debe ser un número finito.",
  "validation.decimal":
    "Debe ser un decimal válido, por ejemplo 19.99 o -0.5.",
  "validation.bigint": "Debe ser un número entero sin decimales.",
  "validation.date": "Debe ser una fecha válida (ISO 8601).",
  "validation.required": "Este campo es obligatorio.",
  "validation.select": "Selecciona una opción.",
  "validation.minLength": "Mínimo {min} caracteres.",
  "validation.maxLength": "Máximo {max} caracteres.",
  "validation.min": "Mínimo {min}.",
  "validation.max": "Máximo {max}.",
  "validation.pattern": "El formato no es válido.",

  "error.unique": "Este valor ya está en uso.",
  "error.uniqueGeneric": "Ya existe un registro con esos datos.",
  "error.relation": "El registro relacionado no existe o no es accesible.",
  "error.notFound": "El registro ya no existe.",
  "error.write": "No se pudo guardar el registro.",
  "error.denied": "No tienes acceso a este recurso.",

  "action.create": "Crear",
  "action.view": "Ver",
  "action.edit": "Editar",
  "action.delete": "Eliminar",
  "action.save": "Guardar",
  "action.cancel": "Cancelar",
  "action.deleteConfirm": "Esta acción no se puede deshacer.",

  "shell.dashboard": "Dashboard",
  "shell.panel": "Panel",
  "shell.list": "Listado",
  "shell.administration": "Administración",
  "shell.account": "Mi cuenta",
  "shell.signOut": "Cerrar sesión",
  "shell.user": "Usuario",
  "shell.organizations": "Organizaciones",
  "shell.noOrganization": "Sin organización",
  "shell.noOrganizations": "Sin organizaciones asignadas",
  "shell.record": "{count} registro",
  "shell.records": "{count} registros",
  "shell.searchPlaceholder": "Buscar…",
  "shell.search": "Buscar",
  "shell.clear": "Limpiar",
  "shell.noResults": "Sin resultados",
  "shell.noMatches": "No hay coincidencias para «{query}».",
  "shell.empty": "Todavía no hay registros.",
  "shell.actions": "Acciones",
  "shell.previous": "Anterior",
  "shell.next": "Siguiente",
  "shell.page": "Página {page} de {total}",
  "shell.createTitle": "Crear {label}",
  "shell.editTitle": "Editar {label}",
  "shell.formHint":
    "La validación final la hace el servidor; el formulario solo evita viajes innecesarios.",
  "shell.detailSubtitle": "Detalle del registro",
  "shell.data": "Datos",
  "shell.back": "Volver",
  "shell.saving": "Guardando…",
  "shell.confirm": "Confirmar",
  "shell.actionDone": "Acción completada.",
  "shell.saved": "Guardado.",
  "shell.deleted": "Eliminado.",
  "shell.confirmAction": "¿Confirmas la acción?",
  "shell.changeTheme": "Cambiar tema",
  "shell.deleteTitle": "¿Eliminar este registro?",
  "shell.selectOption": "Selecciona una opción",
  "shell.noValue": "Sin valor",
  "shell.noResources": "Todavía no hay recursos",
  "shell.noResourcesDescription":
    "El panel ya tiene sidebar, login y esta página. Solo falta el primer recurso.",
  "shell.dashboardDescription":
    "El panel está montado. Los recursos que declares en panel.ts aparecen aquí.",
  "shell.model": "Modelo",
  "shell.open": "Abrir",
  "shell.lightMode": "Modo claro",
  "shell.darkMode": "Modo oscuro",

  "error.session": "La sesión ha caducado. Vuelve a entrar.",
  "error.resourceNotFound": "Recurso no encontrado.",
  "error.actionNotDeclared":
    'La acción "{name}" no está declarada en el recurso.',
  "error.actionNoHandler":
    'La acción "{name}" no tiene handler en src/dashild/actions.',
  "error.actionFailed": "La acción falló.",
  "error.deleteFailed": "No se pudo eliminar el registro.",
};

export const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  es,
};

export function normalizeLocale(locale: string | undefined): Locale {
  return locale === "es" ? "es" : DEFAULT_LOCALE;
}

/**
 * Resolves a key with `{param}` interpolation.
 *
 * Unknown locales fall back to English; unknown keys fall back to the key
 * itself so a missing translation is visible instead of silent.
 */
export function translate(
  locale: Locale | undefined,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const catalog = messages[normalizeLocale(locale)];
  const template = catalog[key] ?? messages.en[key] ?? key;

  return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
    String(params?.[name] ?? ""),
  );
}
