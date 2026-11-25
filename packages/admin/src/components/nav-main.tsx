"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight, LayoutDashboard } from "lucide-react";

import { translate, type Locale } from "@dashild/core";

import { useIcons } from "../icon-context.js";
import { resourceIcon } from "./icon-map.js";


import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible.js";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "../ui/sidebar.js";

export interface NavResource {
  label: string;
  url: string;
  icon?: string;
}

export interface NavGroup {
  label: string;
  resources: NavResource[];
}

interface NavMainProps {
  path: string;
  groups: NavGroup[];
  locale?: Locale;
}

/**
 * Navegación del sidebar-07: grupos y recursos colapsables.
 *
 * Un recurso se abre para enseñar sus páginas (hoy solo el listado; creación y
 * edición llegan con el CRUD). El grupo es una etiqueta, como en Filament.
 */
export function NavMain({ path, groups, locale }: NavMainProps) {
  const icons = useIcons();
  const pathname = usePathname();

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{translate(locale, "shell.panel")}</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === path}
              tooltip={translate(locale, "shell.dashboard")}
              className="data-[active=true]:bg-sidebar-primary! data-[active=true]:text-sidebar-primary-foreground! data-[active=true]:hover:bg-sidebar-primary/90! data-[active=true]:hover:text-sidebar-primary-foreground!"
            >
              <Link href={path}>
                <LayoutDashboard />
                <span>{translate(locale, "shell.dashboard")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.resources.map((resource) => {
              const Icon = resourceIcon(resource.icon, icons);
              const isActive = pathname === resource.url;

              return (
                <Collapsible
                  key={resource.url}
                  asChild
                  defaultOpen={isActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={resource.label}
                        className={isActive ? "text-sidebar-primary" : undefined}
                      >
                        <Icon />
                        <span>{resource.label}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive}
                            className="data-[active=true]:bg-sidebar-primary/10! data-[active=true]:text-sidebar-primary! data-[active=true]:font-medium!"
                          >
                            <Link href={resource.url}>
                              <span>{translate(locale, "shell.list")}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
