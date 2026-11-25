import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";
import { DEFAULT_THEME_MODE, getThemeMode } from "@/lib/theme";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Acme — panel interno",
  description:
    "Aplicación de ejemplo que ya existía antes de instalar Dashild.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // La clase `dark` va en <html> para que también la hereden los portales de
  // shadcn (dropdowns, tooltips), que se renderizan en body. Es infraestructura
  // de la app: Dashild no escribe este archivo en `init`.
  const theme = await getThemeMode(DEFAULT_THEME_MODE);

  return (
    <html
      lang="es"
      className={cn(
        "font-sans",
        geist.variable,
        theme === "dark" && "dark",
      )}
    >
      <body className="min-h-svh bg-background text-foreground antialiased">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
