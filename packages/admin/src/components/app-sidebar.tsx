"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "../ui/sidebar.js";

import type { Locale } from "@dashild/core";

import { NavMain, type NavGroup } from "./nav-main.js";
import { NavUser } from "./nav-user.js";
import {
  OrganizationSwitcher,
  type OrganizationSwitcherProps,
} from "./organization-switcher.js";

export interface AppSidebarProps {
  title: string;
  path: string;
  groups: NavGroup[];
  collapsible?: "icon" | "offcanvas" | "none";
  user: { name: string; email: string };
  signOut?: () => Promise<void>;
  organizations?: OrganizationSwitcherProps["organizations"];
  activeOrganizationId?: string | null;
  switchOrganization?: OrganizationSwitcherProps["switchOrganization"];
  locale?: Locale;
  accountHref?: string;
}

export function AppSidebar({
  title,
  path,
  groups,
  collapsible = "icon",
  user,
  signOut,
  organizations,
  activeOrganizationId,
  switchOrganization,
  locale,
  accountHref,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible={collapsible}>
      <SidebarHeader>
        {switchOrganization && organizations ? (
          <OrganizationSwitcher
            organizations={organizations}
            activeId={activeOrganizationId ?? null}
            title={title}
            switchOrganization={switchOrganization}
            locale={locale}
          />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="cursor-default">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{title}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        <NavMain path={path} groups={groups} locale={locale} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          name={user.name}
          email={user.email}
          signOut={signOut}
          locale={locale}
          accountHref={accountHref}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
