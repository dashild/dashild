import { GalleryVerticalEnd } from "lucide-react";
import Link from "next/link";

import type { PanelColor } from "@dashild/core";
import { PanelTheme, type ThemeMode } from "@dashild/admin";

interface AuthSplitProps {
  brandName: string;
  panelTitle: string;
  quote: string;
  mode: ThemeMode;
  primary?: PanelColor;
  children: React.ReactNode;
}

export function AuthSplit({
  brandName,
  panelTitle,
  quote,
  mode,
  primary,
  children,
}: AuthSplitProps) {
  return (
    <PanelTheme mode={mode} primary={primary}>
      <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-10 p-6 md:p-10">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          <span>{brandName}</span>
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {panelTitle}
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l bg-muted lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-muted" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--primary),transparent_45%)] opacity-20" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <blockquote className="flex max-w-md flex-col gap-3">
            <p className="text-xl font-medium leading-snug">{quote}</p>
            <footer className="text-sm text-muted-foreground">
              Dashild · Your data layer. Your rules. Our guardrails.
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
    </PanelTheme>
  );
}
