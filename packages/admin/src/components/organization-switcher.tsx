"use client";

import { Check, ChevronsUpDown } from "lucide-react";

import { translate, type Locale } from "@dashild/core";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar.js";
import { BrandMark } from "./brand-mark.js";

interface OrganizationOption {
  id: string;
  name: string;
}

export interface OrganizationSwitcherProps {
  organizations: OrganizationOption[];
  activeId: string | null;
  title: string;
  switchOrganization: (formData: FormData) => Promise<void>;
  locale?: Locale;
  /** Panel logo; falls back to the Dashild mark. */
  logo?: string;
}

export function OrganizationSwitcher({
  organizations,
  activeId,
  title,
  switchOrganization,
  locale,
  logo,
}: OrganizationSwitcherProps) {
  const active = organizations.find(
    (organization) => organization.id === activeId,
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
            >
              {logo ? (
                <img
                  src={logo}
                  alt=""
                  aria-hidden="true"
                  className="size-8 rounded-lg object-cover"
                />
              ) : (
                <BrandMark className="size-8!" />
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {active?.name ?? translate(locale, "shell.noOrganization")}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {title}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {translate(locale, "shell.organizations")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {organizations.length === 0 ? (
                <DropdownMenuItem disabled>
                  {translate(locale, "shell.noOrganizations")}
                </DropdownMenuItem>
              ) : (
                organizations.map((organization) => (
                  <DropdownMenuItem key={organization.id} asChild>
                    <form action={switchOrganization}>
                      <input
                        type="hidden"
                        name="organizationId"
                        value={organization.id}
                      />
                      <button
                        type="submit"
                        className="flex w-full cursor-pointer items-center gap-2"
                      >
                        <span className="truncate">{organization.name}</span>
                        {organization.id === activeId ? (
                          <Check className="ml-auto" />
                        ) : null}
                      </button>
                    </form>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
