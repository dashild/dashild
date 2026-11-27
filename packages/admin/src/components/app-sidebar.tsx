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

import type { Locale, PanelBrand } from "@dashild/core";

import { BrandMark } from "./brand-mark.js";
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
  brand?: PanelBrand;
  nextPath?: string;
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
  brand,
  nextPath,
}: AppSidebarProps) {
  const brandLogo = brand?.logo ? (
    <img
      src={brand.logo}
      alt=""
      aria-hidden="true"
      className="size-8 rounded-lg object-cover"
    />
  ) : (
    <BrandMark className="size-8!" />
  );

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
            logo={brand?.logo}
            nextPath={nextPath}
          />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="cursor-default">
                {brandLogo}
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
