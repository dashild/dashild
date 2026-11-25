/**
 * @dashild/admin — client runtime.
 *
 * Presentational shell for the panel. It receives serializable data and server
 * actions as props; it never imports Prisma, policies or the app's panel
 * config. The mount route owns the server-only work.
 */

export { AdminShell, type AdminShellProps } from "./components/admin-shell.js";
export { IconProvider, useIcons } from "./icon-context.js";
export { AppSidebar, type AppSidebarProps } from "./components/app-sidebar.js";
export {
  DashboardHome,
} from "./components/dashboard-home.js";
export { formatCell } from "./components/format-cell.js";
export {
  resolveIcon,
  resourceIcon,
  type IconMap,
} from "./components/icon-map.js";
export { NavMain, type NavGroup, type NavResource } from "./components/nav-main.js";
export { PanelTheme } from "./components/panel-theme.js";
export { ResourceDetail } from "./components/resource-detail.js";
export { ResourceForm, type FormOption } from "./components/resource-form.js";
export { ResourceTable } from "./components/resource-table.js";
export { ThemeSync } from "./components/theme-sync.js";

export { buildFormSchema } from "./forms/schema.js";
export {
  DEFAULT_PANEL_PRIMARY,
  DEFAULT_THEME_MODE,
  maxWidthClass,
  panelThemeStyle,
  type ThemeMode,
} from "./theme.js";

export type {
  DeleteAction,
  FieldErrors,
  RunAction,
  RunActionInput,
  RunActionResult,
  SaveAction,
  SaveInput,
  SaveResult,
} from "./types.js";
