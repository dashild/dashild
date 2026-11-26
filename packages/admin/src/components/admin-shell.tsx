"use client";

import { Suspense } from "react";

import { cn } from "cn";

import type { Locale, PanelColor } from "@dashild/core";

import { SidebarInset, SidebarProvider } from "../ui/sidebar.js";
import { Toaster } from "../ui/sonner.js";
import { TooltipProvider } from "../ui/tooltip.js";
import { AppSidebar } from "./app-sidebar.js";
import { FlashToast } from "./flash-toast.js";
import type { NavGroup } from "./nav-main.js";
import { PanelTheme } from "./panel-theme.js";
import { SiteHeader } from "./site-header.js";
import { maxWidthClass, type ThemeMode } from "../theme.js";

export interface AdminShellProps {
  title: string;
  path: string;
  section: string;
  theme: ThemeMode;
  primary?: PanelColor;
  themeToggle: boolean;
  nextPath: string;
  maxContentWidth?: "sm" | "md" | "lg" | "xl" | "full";
  sidebarCollapsible?: "icon" | "offcanvas" | "none";
  groups: NavGroup[];
  user: { name: string; email: string };
  signOut?: () => Promise<void>;
  organizations?: { id: string; name: string }[];
  activeOrganizationId?: string | null;
  switchOrganization?: (formData: FormData) => Promise<void>;
  themeAction?: (formData: FormData) => Promise<void>;
  locale?: Locale;
  accountHref?: string;
  children: React.ReactNode;
}

/**
 * Panel shell.
 *
 * The page keeps the server-only work (session, policies, data loading) and
 * hands the shell serializable data plus server actions. The shell itself is
 * reusable by any app and never imports Prisma or the app's panel config.
 */
export function AdminShell({
  title,
  path,
  section,
  theme,
  primary,
  themeToggle,
  nextPath,
  maxContentWidth,
  sidebarCollapsible,
  groups,
  user,
  signOut,
  organizations,
  activeOrganizationId = null,
  switchOrganization,
  themeAction,
  locale,
  accountHref,
  children,
}: AdminShellProps) {
  return (
    <PanelTheme mode={theme} primary={primary}>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar
            title={title}
            path={path}
            groups={groups}
            collapsible={sidebarCollapsible}
            user={user}
            signOut={signOut}
            organizations={organizations}
            activeOrganizationId={activeOrganizationId}
            switchOrganization={switchOrganization}
            locale={locale}
            accountHref={accountHref}
          />
          <SidebarInset>
            <SiteHeader
              section={section}
              path={path}
              theme={theme}
              themeToggle={themeToggle}
              nextPath={nextPath}
              themeAction={themeAction}
              locale={locale}
            />
            <div
              className={cn(
                "mx-auto w-full flex-1 p-4 md:p-6",
                maxWidthClass(maxContentWidth),
              )}
            >
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
      <Suspense fallback={null}>
        <FlashToast locale={locale} />
      </Suspense>
      <Toaster theme={theme} />
    </PanelTheme>
  );
}
