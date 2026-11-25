"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();

  // Auth y panel tienen su propio layout: no duplicar la cabecera de la app.
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-semibold tracking-tight">
          Acme
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/admin" className="hover:text-foreground">
            Admin
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Entrar
          </Link>
        </nav>
      </div>
    </header>
  );
}
