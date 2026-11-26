import { Monitor, Moon, Sun } from "lucide-react";

import { translate, type Locale } from "@dashild/core";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb.js";
import { Button } from "../ui/button.js";
import { Separator } from "../ui/separator.js";
import { SidebarTrigger } from "../ui/sidebar.js";
import type { ThemeMode } from "../theme.js";

interface SiteHeaderProps {
  section: string;
  path: string;
  theme: ThemeMode;
  themeToggle: boolean;
  nextPath: string;
  themeAction?: (formData: FormData) => Promise<void>;
  locale?: Locale;
}

export function SiteHeader({
  section,
  path,
  theme,
  themeToggle,
  nextPath,
  themeAction,
  locale,
}: SiteHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink asChild>
              <Link href={path}>{translate(locale, "shell.administration")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>{section}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {themeToggle && themeAction ? (
        <form action={themeAction} className="ml-auto">
          <input type="hidden" name="next" value={nextPath} />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label={translate(locale, "shell.changeTheme")}
          >
            {theme === "dark" ? (
              <Sun />
            ) : theme === "system" ? (
              <Monitor />
            ) : (
              <Moon />
            )}
          </Button>
        </form>
      ) : null}
    </header>
  );
}
