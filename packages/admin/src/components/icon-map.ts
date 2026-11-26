import type { ElementType } from "react";

import {
  Briefcase,
  Building2,
  Calendar,
  ChartBar,
  CreditCard,
  Database,
  FileText,
  Folder,
  LayoutDashboard,
  Layers,
  Mail,
  Package,
  Settings,
  ShoppingCart,
  Table2,
  Tag,
  Truck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon resolution for the shell.
 *
 * A base lucide map plus the app's `src/dashild/icons.ts` map, which is passed
 * as a prop. App icons win. Unknown names fall back to `Table2` for resources
 * and to no icon for actions, with a development warning.
 */
export type IconMap = Record<string, ElementType>;

const DEFAULT_ICONS: IconMap = {
  users: Users,
  user: User,
  "file-text": FileText,
  settings: Settings,
  database: Database,
  folder: Folder,
  chart: ChartBar,
  "layout-dashboard": LayoutDashboard,
  building: Building2,
  organization: Building2,
  package: Package,
  "shopping-cart": ShoppingCart,
  tag: Tag,
  calendar: Calendar,
  mail: Mail,
  briefcase: Briefcase,
  "credit-card": CreditCard,
  truck: Truck,
  layers: Layers,
};

const warned = new Set<string>();

export function resolveIcon(
  name: string | undefined,
  icons?: IconMap,
): ElementType | undefined {
  if (!name) return undefined;

  const icon = icons?.[name] ?? DEFAULT_ICONS[name];
  if (icon) return icon;

  if (process.env.NODE_ENV !== "production" && !warned.has(name)) {
    warned.add(name);
    console.warn(
      `[dashild] icon "${name}" is not in the map; using the generic icon. Add it to src/dashild/icons.tsx.`,
    );
  }

  return undefined;
}

export function resourceIcon(
  name: string | undefined,
  icons?: IconMap,
): ElementType {
  return resolveIcon(name, icons) ?? Table2;
}

export type { LucideIcon };
